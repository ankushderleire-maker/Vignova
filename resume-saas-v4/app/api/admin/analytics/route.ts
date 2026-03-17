import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export async function GET(req: Request) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const days = parseInt(searchParams.get("days") || "30");

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // User signups over time
        const users = await db.users.findMany({
            where: { created_at: { gte: startDate } },
            select: { created_at: true },
            orderBy: { created_at: "asc" },
        });

        // Resumes over time
        const resumes = await db.generatedResume.findMany({
            where: { createdAt: { gte: startDate } },
            select: { createdAt: true, source: true },
            orderBy: { createdAt: "asc" },
        });

        // Revenue over time
        const payments = await db.payment.findMany({
            where: {
                createdAt: { gte: startDate },
                status: "COMPLETED",
            },
            select: { createdAt: true, amount: true },
            orderBy: { createdAt: "asc" },
        });

        // Group by date helper
        const groupByDate = (items: { date: Date }[]) => {
            const map: Record<string, number> = {};
            items.forEach((item) => {
                const dateKey = item.date.toISOString().split("T")[0];
                map[dateKey] = (map[dateKey] || 0) + 1;
            });
            return map;
        };

        const groupRevenueByDate = (items: { date: Date; amount: number }[]) => {
            const map: Record<string, number> = {};
            items.forEach((item) => {
                const dateKey = item.date.toISOString().split("T")[0];
                map[dateKey] = (map[dateKey] || 0) + item.amount;
            });
            return map;
        };

        const signupsByDate = groupByDate(
            users.map((u) => ({ date: u.created_at }))
        );
        const resumesByDate = groupByDate(
            resumes.map((r) => ({ date: r.createdAt }))
        );
        const revenueByDate = groupRevenueByDate(
            payments.map((p) => ({ date: p.createdAt, amount: p.amount }))
        );

        // Fill in missing dates
        const allDates: string[] = [];
        const current = new Date(startDate);
        const today = new Date();
        while (current <= today) {
            allDates.push(current.toISOString().split("T")[0]);
            current.setDate(current.getDate() + 1);
        }

        const chartData = allDates.map((date) => ({
            date,
            signups: signupsByDate[date] || 0,
            resumes: resumesByDate[date] || 0,
            revenue: revenueByDate[date] || 0,
        }));

        return NextResponse.json({ chartData, days });
    } catch (error) {
        console.error("[ADMIN_ANALYTICS]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
