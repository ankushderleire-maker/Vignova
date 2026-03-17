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
        const search = searchParams.get("search") || "";
        const plan = searchParams.get("plan") || "";
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
            where.subscriptions = { some: { plan_type: plan } };
        }

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

        return NextResponse.json({
            users: users.map((u) => ({
                id: u.id,
                email: u.email,
                fullName: u.full_name,
                role: u.role,
                createdAt: u.created_at,
                subscription: u.subscriptions[0] || null,
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
