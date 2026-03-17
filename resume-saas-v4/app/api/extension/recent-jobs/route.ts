import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getExtensionUser } from "@/lib/extensionAuth";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";

export async function OPTIONS() {
    return handleCorsOptions();
}

/**
 * GET /api/extension/recent-jobs
 * Returns the user's 5 most recent job applications.
 */
export async function GET(req: Request) {
    try {
        const auth = await getExtensionUser(req);
        if (auth.error) {
            return withCors(NextResponse.json({ error: auth.error }, { status: auth.status }));
        }

        const userId = auth.user!.id;

        const jobs = await db.jobApplication.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                jobTitle: true,
                company: true,
                createdAt: true,
            }
        });

        return withCors(NextResponse.json({ success: true, jobs }));
    } catch (error: any) {
        console.error("[EXT_RECENT_JOBS_GET]", error);
        return withCors(NextResponse.json({ error: "Failed to fetch recent jobs" }, { status: 500 }));
    }
}
