/**
 * Runs the JD formatter after a job is saved, without making the caller wait.
 *
 * The extension's save and the manual paste both return as soon as the row is
 * written; formatting lands a second or two later. `after()` is what keeps the
 * work alive once the response has been sent — a bare floating promise can be
 * cut short when the request finishes.
 *
 * Nothing here throws. A formatting failure must never fail a save.
 */

import { after } from "next/server";
import { db } from "@/lib/db";
import { formatJobDescription, type JdEnvelope } from "@/lib/jdFormatter";

/** Jobs currently being formatted in this process, so a double-save doesn't
 *  pay for the same posting twice. */
const inFlight = new Set<string>();

function pendingEnvelope(): JdEnvelope {
    return {
        status: "PENDING",
        version: 1,
        source: "parser",
        model: null,
        formattedAt: new Date().toISOString(),
        data: null,
    };
}

async function runFormat(jobId: string): Promise<void> {
    if (inFlight.has(jobId)) return;
    inFlight.add(jobId);

    try {
        const job = await db.jobApplication.findUnique({
            where: { id: jobId },
            select: { id: true, userId: true, jobTitle: true, company: true, location: true, salary: true, description: true },
        });
        if (!job?.description) return;

        const envelope = await formatJobDescription(job.description, {
            jobTitle: job.jobTitle,
            company: job.company,
            location: job.location,
            salary: job.salary,
            userId: job.userId,
        });

        await db.jobApplication.update({
            where: { id: jobId },
            data: { formattedJd: envelope as any },
        });
    } catch (error) {
        console.error("[JD_FORMAT_QUEUE]", jobId, error);
        // Leave the row's previous value alone; the on-demand endpoint can retry.
    } finally {
        inFlight.delete(jobId);
    }
}

/**
 * Marks the job as pending and schedules formatting for after the response.
 * Safe to call on every save — it is a no-op when there's no description.
 */
export function queueJdFormat(jobId: string, description?: string | null): void {
    if (!jobId || !description || !description.trim()) return;

    after(async () => {
        try {
            // So the UI can show "formatting…" instead of an empty preview.
            await db.jobApplication.update({
                where: { id: jobId },
                data: { formattedJd: pendingEnvelope() as any },
            });
        } catch {
            // Row may have been deleted between save and here; runFormat re-checks.
        }
        await runFormat(jobId);
    });
}

/**
 * Formats now and returns the result. Used by the on-demand endpoint so jobs
 * saved before this feature existed — or whose background run was interrupted —
 * get formatted the first time someone opens them.
 */
export async function formatJdNow(jobId: string): Promise<JdEnvelope | null> {
    const job = await db.jobApplication.findUnique({
        where: { id: jobId },
        select: { id: true, userId: true, jobTitle: true, company: true, location: true, salary: true, description: true },
    });
    if (!job?.description) return null;

    const envelope = await formatJobDescription(job.description, {
        jobTitle: job.jobTitle,
        company: job.company,
        location: job.location,
        salary: job.salary,
        userId: job.userId,
    });

    await db.jobApplication.update({
        where: { id: jobId },
        data: { formattedJd: envelope as any },
    });

    return envelope;
}
