import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id as string | undefined;
        
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const history = await db.savedInterview.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" }
        });

        const jobIds = history.filter((h: any) => h.jobId).map((h: any) => h.jobId) as string[];
        
        const jobs = await db.jobApplication.findMany({
            where: { id: { in: jobIds } },
            select: { id: true, company: true, jobTitle: true }
        });
        
        const jobMap = new Map(jobs.map(j => [j.id, j]));

        const historyWithJobs = history.map(h => {
            if (h.jobId && jobMap.has(h.jobId)) {
                return { ...h, jobDetails: jobMap.get(h.jobId) };
            }
            return h;
        });

        return NextResponse.json({ success: true, history: historyWithJobs }, { status: 200 });
    } catch (error) {
        console.error("Failed to fetch interview history:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
