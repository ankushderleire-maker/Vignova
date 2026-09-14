import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { currentPeriodStart } from "@/lib/planLimits";

export async function GET(req: Request) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20") || 20));
        const search = searchParams.get("search") || "";
        const plan = searchParams.get("plan") || "";
        const role = searchParams.get("role") || "";
        const status = searchParams.get("status") || "";
        const skip = (page - 1) * limit;

        // Build where clause
        const where: Record<string, unknown> = {};

        if (search) {
            where.OR = [
                { email: { contains: search, mode: "insensitive" } },
                { full_name: { contains: search, mode: "insensitive" } },
            ];
        }

        if (plan) {
            where.subscriptions = { is: { plan_type: plan } };
        }

        if (role) where.role = role;
        if (status) where.status = status;

        const [users, total] = await Promise.all([
            db.users.findMany({
                where,
                include: {
                    subscriptions: {
                        select: {
                            plan_type: true,
                            credits_remaining: true,
                            credits_total: true,
                            expires_at: true,
                        },
                    },
                    credit_buckets: {
                        select: { bucket: true, remaining: true, total: true, period_start: true },
                    },
                    _count: {
                        select: {
                            generated_resumes: true,
                            job_applications: true,
                            payments: true,
                        },
                    },
                },
                orderBy: { created_at: "desc" },
                skip,
                take: limit,
            }),
            db.users.count({ where }),
        ]);

        const periodStart = currentPeriodStart();
        return NextResponse.json({
            users: users.map((u) => ({
                id: u.id,
                email: u.email,
                fullName: u.full_name,
                role: u.role,
                status: u.status,
                createdAt: u.created_at,
                subscription: u.subscriptions || null,
                // Read-only. A row from an earlier month is shown as the full
                // allowance it refills to on the user's next request, instead
                // of being refilled here, so opening this list writes nothing.
                credits: u.credit_buckets.map((row) => ({
                    bucket: row.bucket,
                    total: row.total,
                    remaining: row.period_start < periodStart ? row.total : Math.max(0, row.remaining),
                })),
                counts: {
                    resumes: u._count.generated_resumes,
                    jobs: u._count.job_applications,
                    payments: u._count.payments,
                },
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("[ADMIN_USERS]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
