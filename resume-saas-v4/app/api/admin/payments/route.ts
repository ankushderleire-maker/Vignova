import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export async function GET(req: Request) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const status = searchParams.get("status") || "";
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {};
        if (status) where.status = status;

        const [payments, total] = await Promise.all([
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
