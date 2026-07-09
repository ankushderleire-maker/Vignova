import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-guard";
import { db } from "@/lib/db";

function csvEscape(value: unknown): string {
    const s = value === null || value === undefined ? "" : String(value);
    if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

export async function GET(req: Request) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20") || 20));
        const status = searchParams.get("status") || "";
        const search = searchParams.get("search") || "";
        const from = searchParams.get("from") || "";
        const to = searchParams.get("to") || "";
        const format = searchParams.get("format") || "";
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {};
        if (status) where.status = status;
        if (search) {
            where.user = {
                OR: [
                    { email: { contains: search, mode: "insensitive" } },
                    { full_name: { contains: search, mode: "insensitive" } },
                ],
            };
        }
        const createdAt: Record<string, Date> = {};
        if (from) {
            const d = new Date(from);
            if (!isNaN(d.getTime())) createdAt.gte = d;
        }
        if (to) {
            const d = new Date(to);
            if (!isNaN(d.getTime())) {
                d.setHours(23, 59, 59, 999); // include the whole "to" day
                createdAt.lte = d;
            }
        }
        if (Object.keys(createdAt).length > 0) where.createdAt = createdAt;

        // CSV export path — same filters, no pagination (capped).
        if (format === "csv") {
            const payments = await db.payment.findMany({
                where,
                include: { user: { select: { email: true, full_name: true } } },
                orderBy: { createdAt: "desc" },
                take: 50000,
            });

            const header = [
                "id", "user_email", "user_name", "amount", "currency", "status",
                "payment_method", "transaction_id", "plan_type", "billing_cycle", "created_at",
            ].join(",");
            const rows = payments.map((p) =>
                [
                    p.id, p.user.email, p.user.full_name, p.amount, p.currency, p.status,
                    p.paymentMethod, p.transactionId, p.planType, p.billingCycle,
                    p.createdAt.toISOString(),
                ].map(csvEscape).join(",")
            );

            await logAdminAction({
                admin: auth.user,
                action: "PAYMENTS_EXPORT",
                targetType: "payment",
                details: { count: payments.length, filters: { status, search, from, to } },
                req,
            });

            return new NextResponse([header, ...rows].join("\r\n"), {
                headers: {
                    "Content-Type": "text/csv; charset=utf-8",
                    "Content-Disposition": `attachment; filename="vignova-payments-${new Date().toISOString().slice(0, 10)}.csv"`,
                },
            });
        }

        const [payments, total, summary] = await Promise.all([
            db.payment.findMany({
                where,
                include: {
                    user: {
                        select: { email: true, full_name: true },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            db.payment.count({ where }),
            db.payment.aggregate({
                _sum: { amount: true },
                where: { ...where, status: "COMPLETED" },
            }),
        ]);

        return NextResponse.json({
            payments: payments.map((p) => ({
                id: p.id,
                userEmail: p.user.email,
                userName: p.user.full_name,
                amount: p.amount,
                currency: p.currency,
                status: p.status,
                paymentMethod: p.paymentMethod,
                transactionId: p.transactionId,
                planType: p.planType,
                billingCycle: p.billingCycle,
                createdAt: p.createdAt,
            })),
            summary: {
                completedTotal: summary._sum.amount || 0,
            },
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("[ADMIN_PAYMENTS]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
