import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export async function GET() {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    try {
        const [
            totalUsers,
            totalResumes,
            totalJobs,
            totalPayments,
            activeSubscriptions,
            revenueResult,
            newUsersToday,
        ] = await Promise.all([
            db.users.count(),
            db.generatedResume.count(),
            db.jobApplication.count(),
            db.payment.count(),
            db.subscriptions.count({ where: { plan_type: { not: "FREE" } } }),
            db.payment.aggregate({
                _sum: { amount: true },
                where: { status: "COMPLETED" },
            }),
            db.users.count({
                where: {
                    created_at: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
            }),
        ]);

        // Recent signups (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentUsers = await db.users.findMany({
            where: { created_at: { gte: sevenDaysAgo } },
            select: { id: true, email: true, full_name: true, created_at: true },
            orderBy: { created_at: "desc" },
            take: 10,
        });

        // Plan distribution
        const planDistribution = await db.subscriptions.groupBy({
            by: ["plan_type"],
            _count: { plan_type: true },
        });

        return NextResponse.json({
            totalUsers,
            totalResumes,
            totalJobs,
            totalPayments,
            activeSubscriptions,
            totalRevenue: revenueResult._sum.amount || 0,
            newUsersToday,
            recentUsers,
            planDistribution: planDistribution.map((p) => ({
                plan: p.plan_type,
                count: p._count.plan_type,
            })),
        });
    } catch (error) {
        console.error("[ADMIN_STATS]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
