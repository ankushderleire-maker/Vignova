import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!(session?.user as any)?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session?.user as any)?.id as string;
        const { searchParams } = new URL(req.url);
        const period = searchParams.get("period") || "day"; // day | week | month

        // Get total counts (using camelCase model names)
        const [totalResumes, extensionResumes, totalJobs, jobStatusCounts] = await Promise.all([
            db.generatedResume.count({ where: { userId } }),
            db.generatedResume.count({ where: { userId, source: { in: ["extension", "EXTENSION"] } } }),
            db.jobApplication.count({ where: { userId } }),
            db.jobApplication.groupBy({
                by: ['status'],
                where: { userId },
                _count: {
                    status: true,
                },
            }),
        ]);

        // Process job status counts
        const jobStats = {
            saved: 0,
            applied: 0,
            interviewing: 0,
            offer: 0
        };

        jobStatusCounts.forEach((item) => {
            const status = item.status.toLowerCase();
            if (status === 'saved') jobStats.saved = item._count.status;
            if (status === 'applied') jobStats.applied = item._count.status;
            if (status === 'interviewing') jobStats.interviewing = item._count.status;
            if (status === 'offer') jobStats.offer = item._count.status;
        });

        // Month-over-month movement, so the cards can say "+9 from last month"
        // rather than showing a bare total with no sense of direction.
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const weekStart = new Date(now.getTime() - 7 * 24 * 3_600_000);
        const previousWeekStart = new Date(now.getTime() - 14 * 24 * 3_600_000);

        const [
            resumesThisMonth,
            resumesLastMonth,
            extensionThisMonth,
            extensionLastMonth,
            jobsThisMonth,
            jobsLastMonth,
            resumesThisWeek,
            resumesLastWeek,
            appliedThisWeek,
            appliedLastWeek,
            interviewsBooked,
        ] = await Promise.all([
            db.generatedResume.count({ where: { userId, createdAt: { gte: monthStart } } }),
            db.generatedResume.count({ where: { userId, createdAt: { gte: previousMonthStart, lt: monthStart } } }),
            db.generatedResume.count({ where: { userId, source: { in: ["extension", "EXTENSION"] }, createdAt: { gte: monthStart } } }),
            db.generatedResume.count({ where: { userId, source: { in: ["extension", "EXTENSION"] }, createdAt: { gte: previousMonthStart, lt: monthStart } } }),
            db.jobApplication.count({ where: { userId, createdAt: { gte: monthStart } } }),
            db.jobApplication.count({ where: { userId, createdAt: { gte: previousMonthStart, lt: monthStart } } }),
            db.generatedResume.count({ where: { userId, createdAt: { gte: weekStart } } }),
            db.generatedResume.count({ where: { userId, createdAt: { gte: previousWeekStart, lt: weekStart } } }),
            // updatedAt is the only timestamp a status change touches, so this
            // counts applications *moved* to APPLIED in the window.
            db.jobApplication.count({ where: { userId, status: "APPLIED", updatedAt: { gte: weekStart } } }),
            db.jobApplication.count({ where: { userId, status: "APPLIED", updatedAt: { gte: previousWeekStart, lt: weekStart } } }),
            db.jobApplication.count({ where: { userId, interviewAt: { gte: now } } }),
        ]);

        const trend = (current: number, previous: number) => ({
            current,
            previous,
            change: current - previous,
            percent: previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100),
        });

        // Get time-series data for graphs
        const daysAgo = period === "month" ? 30 : period === "week" ? 7 : 30; // Always get 30 days for daily view
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - daysAgo);

        // Fetch all resumes in the period
        const resumes = await db.generatedResume.findMany({
            where: {
                userId,
                createdAt: {
                    gte: startDate,
                },
            },
            select: {
                createdAt: true,
                source: true,
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        // Group by period
        const statsMap: Record<string, { manual: number; extension: number }> = {};

        resumes.forEach((resume: { createdAt: Date; source: string }) => {
            let key: string;
            const date = new Date(resume.createdAt);

            if (period === "day") {
                // Group by day
                key = date.toISOString().split("T")[0]; // YYYY-MM-DD
            } else if (period === "week") {
                // Group by week (Monday as start)
                const weekStart = new Date(date);
                const day = weekStart.getDay();
                const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
                weekStart.setDate(diff);
                key = weekStart.toISOString().split("T")[0];
            } else {
                // Group by month
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            }

            if (!statsMap[key]) {
                statsMap[key] = { manual: 0, extension: 0 };
            }

            if (resume.source === "extension" || resume.source === "EXTENSION") {
                statsMap[key].extension++;
            } else {
                statsMap[key].manual++;
            }
        });

        // Convert to array and fill gaps
        const dailyStats = [];
        for (let i = 0; i < daysAgo; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);

            let key: string;
            if (period === "day") {
                key = date.toISOString().split("T")[0];
            } else if (period === "week") {
                const weekStart = new Date(date);
                const day = weekStart.getDay();
                const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
                weekStart.setDate(diff);
                key = weekStart.toISOString().split("T")[0];
            } else {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            }

            const data = statsMap[key] || { manual: 0, extension: 0 };
            dailyStats.push({
                date: key,
                total: data.manual + data.extension,
                manual: data.manual,
                extension: data.extension,
            });
        }

        return NextResponse.json({
            totalResumes,
            extensionResumes,
            totalJobs,
            jobStats,
            period,
            stats: dailyStats,
            trends: {
                resumes: trend(resumesThisMonth, resumesLastMonth),
                extensionResumes: trend(extensionThisMonth, extensionLastMonth),
                jobs: trend(jobsThisMonth, jobsLastMonth),
            },
            thisWeek: {
                applicationsSent: trend(appliedThisWeek, appliedLastWeek),
                resumesCreated: trend(resumesThisWeek, resumesLastWeek),
                interviewsBooked,
            },
        });
    } catch (error) {
        console.error("[DASHBOARD_STATS]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
