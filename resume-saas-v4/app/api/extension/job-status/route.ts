import { NextResponse } from "next/server";
import { getExtensionUser } from "@/lib/extensionAuth";
import { db } from "@/lib/db";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";

export const OPTIONS = handleCorsOptions;

/**
 * Sets the pipeline status of a tracked job from the extension, so someone can
 * mark an application as sent without opening the dashboard.
 *
 * Matched by jobUrl rather than an id: the extension knows the page it is on,
 * not our primary keys. If the job isn't tracked yet there is nothing to move,
 * which the caller shows as a prompt to tailor a resume first.
 */

const ALLOWED = new Set(["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"]);

export async function POST(req: Request) {
    try {
        const auth = await getExtensionUser(req);
        if (auth.error || !auth.user) {
            return withCors(
                NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 })
            );
        }

        const { jobUrl, status } = await req.json();

        if (!jobUrl || typeof jobUrl !== "string") {
            return withCors(NextResponse.json({ error: "A job URL is required." }, { status: 400 }));
        }
        if (!ALLOWED.has(status)) {
            return withCors(NextResponse.json({ error: "Unknown status." }, { status: 400 }));
        }

        // Postings carry tracking parameters that differ between visits, so
        // match on the path as well as the exact URL.
        const bare = jobUrl.split("?")[0];
        const job = await db.jobApplication.findFirst({
            where: {
                userId: auth.user.id,
                OR: [{ jobUrl }, { jobUrl: bare }, { jobUrl: { startsWith: bare } }],
            },
            orderBy: { createdAt: "desc" },
            select: { id: true },
        });

        if (!job) {
            return withCors(
                NextResponse.json({ error: "This job isn't in your tracker yet." }, { status: 404 })
            );
        }

        await db.jobApplication.update({ where: { id: job.id }, data: { status } });
        return withCors(NextResponse.json({ ok: true, jobId: job.id, status }));
    } catch (error) {
        console.error("[EXTENSION_JOB_STATUS]", error);
        return withCors(NextResponse.json({ error: "Could not set the status." }, { status: 500 }));
    }
}
