import { db } from "@/lib/db";

/**
 * "Have we already made this?" — the check that runs before the extension
 * spends a credit.
 *
 * Someone opening the same posting twice (a saved tab, a search result they
 * click again, a page LinkedIn re-renders) previously got a second full
 * generation: another credit gone, another job row, another resume in the
 * dashboard that looks like a duplicate. The generate routes now ask this
 * first and hand the answer back so the extension can say "you already have
 * one of these — generate again?" instead of quietly charging for it.
 *
 * Matched on the job URL because that is the only stable identifier the
 * extension holds; it knows the page it is on, not our primary keys.
 */

export type ExistingWork = {
    jobId: string;
    jobTitle: string;
    company: string;
    /** ISO timestamp of the most recent generation for this posting. */
    generatedAt: string;
    resume: boolean;
    coverLetter: boolean;
    email: boolean;
    resumeId: string | null;
};

/**
 * The tracked job for this posting, or null.
 *
 * Postings carry tracking parameters that differ between visits
 * (`?refId=`, `?trackingId=`, utm tags), so the query path is matched as
 * well as the exact URL. Most recent wins: if a posting somehow has two
 * rows, the newest is the one the user just worked on.
 */
export async function findJobByUrl(userId: string, jobUrl?: string | null) {
    const url = (jobUrl || "").trim();
    if (!url) return null;

    const bare = url.split("?")[0];

    return db.jobApplication.findFirst({
        where: {
            userId,
            OR: [{ jobUrl: url }, { jobUrl: bare }, { jobUrl: { startsWith: bare } }],
        },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            jobTitle: true,
            company: true,
            // So a status change can fill in a logo the row is missing.
            companyLogo: true,
            // The extension's status dropdown renders this, so a posting shows
            // "Saved" / "Interview" instead of an empty placeholder.
            status: true,
            coverLetter: true,
            draftEmail: true,
            createdAt: true,
            updatedAt: true,
        },
    });
}

/**
 * What already exists for this posting, or null when there is nothing worth
 * warning about. A job row on its own is not enough — someone can save a job
 * without generating anything, and that should not block a first generation.
 */
export async function findExistingWork(userId: string, jobUrl?: string | null): Promise<ExistingWork | null> {
    const job = await findJobByUrl(userId, jobUrl);
    if (!job) return null;

    const resume = await db.generatedResume.findFirst({
        where: { userId, jobId: job.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, createdAt: true },
    });

    const hasResume = Boolean(resume);
    const hasCoverLetter = Boolean(job.coverLetter && job.coverLetter.trim());
    const hasEmail = Boolean(job.draftEmail && job.draftEmail.trim());

    if (!hasResume && !hasCoverLetter && !hasEmail) return null;

    const generatedAt = resume?.createdAt ?? job.updatedAt ?? job.createdAt;

    return {
        jobId: job.id,
        jobTitle: job.jobTitle,
        company: job.company,
        generatedAt: generatedAt.toISOString(),
        resume: hasResume,
        coverLetter: hasCoverLetter,
        email: hasEmail,
        resumeId: resume?.id ?? null,
    };
}

/**
 * The 409 the generate routes return when work already exists and the caller
 * did not pass `force`. Deliberately not an error shape the extension would
 * show as a failure — `duplicate: true` is the signal to ask the question.
 */
export function duplicateResponse(existing: ExistingWork) {
    const made = [
        existing.resume && "a resume",
        existing.coverLetter && "a cover letter",
        existing.email && "an application email",
    ].filter(Boolean) as string[];

    const list =
        made.length > 1 ? `${made.slice(0, -1).join(", ")} and ${made[made.length - 1]}` : made[0];

    return {
        duplicate: true,
        existing,
        message: `You already generated ${list} for ${existing.jobTitle} at ${existing.company}. Generate again?`,
    };
}
