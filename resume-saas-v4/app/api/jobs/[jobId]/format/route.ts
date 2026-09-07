import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { formatJdNow } from "@/lib/jdFormatQueue";

export const maxDuration = 60;

/**
 * POST /api/jobs/[jobId]/format
 *
 * Formats a job description on demand and caches the result on the row.
 *
 * Jobs saved before the formatter existed have no structured version, and a
 * background run can be cut short by a restart. The preview calls this the
 * first time it opens such a job, so the library heals itself instead of
 * needing a migration pass over every row.
 *
 * Already-formatted jobs return the cached result without spending a call,
 * unless `force` is set.
 */
export async function POST(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;

    // Scoped by userId so a guessed job id can't format someone else's row.
    const job = await db.jobApplication.findFirst({
        where: { id: jobId, userId },
        select: { id: true, description: true, formattedJd: true },
    });

    if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (!job.description?.trim()) {
        return NextResponse.json({ error: "This job has no description to format." }, { status: 400 });
    }

    const force = await req
        .json()
        .then((body) => Boolean(body?.force))
        .catch(() => false);

    // Only an AI result is final. A parser fallback means the model was
    // unreachable at save time (a rate-limit blip, say), so retry it on the
    // next open rather than leaving that job on the weaker output forever.
    const cached = job.formattedJd as any;
    if (!force && cached?.status === "READY" && cached?.data && cached?.source === "ai") {
        return NextResponse.json({ formattedJd: cached, cached: true });
    }

    try {
        const envelope = await formatJdNow(jobId);
        return NextResponse.json({ formattedJd: envelope, cached: false });
    } catch (error) {
        console.error("[JOB_FORMAT_POST]", error);
        return NextResponse.json({ error: "Could not format this job description." }, { status: 500 });
    }
}
