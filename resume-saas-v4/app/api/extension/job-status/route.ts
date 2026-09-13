import { NextResponse } from "next/server";
import { getExtensionUser } from "@/lib/extensionAuth";
import { db } from "@/lib/db";
import { safeCompanyLogo } from "@/lib/companyLogo";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";
import { findJobByUrl, findExistingWork } from "@/lib/extensionDuplicate";

export const OPTIONS = handleCorsOptions;

/**
 * Sets the pipeline status of a job from the extension, so someone can save a
 * posting or mark it applied without opening the dashboard.
 *
 * Creates the job when it isn't tracked yet. Picking "Saved" on a posting you
 * have never touched is the most natural way to save it, and refusing with
 * "this job isn't in your tracker yet" made the dropdown look broken — there
 * was no other way to add it from the page.
 *
 * Matched by jobUrl rather than an id: the extension knows the page it is on,
 * not our primary keys. It must send the canonical job URL — the one the
 * generate routes use — or the same posting ends up tracked twice.
 *
 * Free on every plan: no model is involved.
 */

const ALLOWED = new Set(["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"]);

/**
 * GET /api/extension/job-status?jobUrl=...
 *
 * Everything the injected bar needs to render a posting the user has already
 * touched: the pipeline status for the dropdown, and whether a resume or
 * cover letter exists so the buttons stop offering to generate them again.
 *
 * This lived only in chrome.storage.local before, which lost it on every auth
 * re-sync (clearUserData drops every http* key) and never followed the user
 * to a second browser. The server is the only honest source of truth.
 *
 * Free on every plan: a read, no model involved.
 */
export async function GET(req: Request) {
    try {
        const auth = await getExtensionUser(req);
        if (auth.error || !auth.user) {
            return withCors(
                NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 })
            );
        }

        const jobUrl = new URL(req.url).searchParams.get("jobUrl");
        if (!jobUrl) {
            return withCors(NextResponse.json({ error: "A job URL is required." }, { status: 400 }));
        }

        const job = await findJobByUrl(auth.user.id, jobUrl);
        if (!job) {
            return withCors(NextResponse.json({
                ok: true, tracked: false, status: null, resume: false, coverLetter: false,
            }));
        }

        // A tracked job with nothing generated yet returns null here, which is
        // why resume/coverLetter are read off it defensively rather than assumed.
        const work = await findExistingWork(auth.user.id, jobUrl);

        // ?include=content also returns the cover letter and application email
        // themselves, so the extension can reopen what already exists in the
        // page overlay instead of sending the user off to the dashboard.
        // findJobByUrl already selects both, so this costs no extra query.
        const content = new URL(req.url).searchParams.get("include") === "content"
            ? { coverLetterText: job.coverLetter || "", draftEmailText: job.draftEmail || "" }
            : {};

        return withCors(NextResponse.json({
            ...content,
            ok: true,
            tracked: true,
            jobId: job.id,
            status: job.status ?? null,
            resume: Boolean(work?.resume),
            coverLetter: Boolean(work?.coverLetter),
            resumeId: work?.resumeId ?? null,
            generatedAt: work?.generatedAt ?? null,
        }));
    } catch (error: any) {
        console.error("[EXT_JOB_STATUS_GET]", error);
        return withCors(NextResponse.json({ error: "Could not read the job status." }, { status: 500 }));
    }
}

export async function POST(req: Request) {
    try {
        const auth = await getExtensionUser(req);
        if (auth.error || !auth.user) {
            return withCors(
                NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 })
            );
        }

        const { jobUrl, status, jobTitle, company, location, description, companyLogo } = await req.json();
        const logo = safeCompanyLogo(companyLogo);

        if (!jobUrl || typeof jobUrl !== "string") {
            return withCors(NextResponse.json({ error: "A job URL is required." }, { status: 400 }));
        }
        if (!ALLOWED.has(status)) {
            return withCors(NextResponse.json({ error: "Unknown status." }, { status: 400 }));
        }

        const existing = await findJobByUrl(auth.user.id, jobUrl);

        if (existing) {
            const job = await db.jobApplication.update({
                where: { id: existing.id },
                data: {
                    status,
                    // Fill in anything the row is missing — a job first created
                    // by a status change has no description until the user
                    // opens it again with the scraper running.
                    ...(jobTitle && !existing.jobTitle ? { jobTitle } : {}),
                    ...(company && !existing.company ? { company } : {}),
                    ...(logo && !existing.companyLogo ? { companyLogo: logo } : {}),
                },
                select: { id: true, status: true },
            });
            return withCors(NextResponse.json({ ok: true, jobId: job.id, status: job.status, created: false }));
        }

        // Not tracked yet — save it. The scraped title and company are the only
        // things worth requiring; everything else can be filled in later from
        // the dashboard.
        if (!jobTitle || !company) {
            return withCors(
                NextResponse.json(
                    { error: "Could not read the job title from this page. Open the posting and try again." },
                    { status: 400 }
                )
            );
        }

        const job = await db.jobApplication.create({
            data: {
                userId: auth.user.id,
                company: String(company).slice(0, 300),
                jobTitle: String(jobTitle).slice(0, 300),
                description: typeof description === "string" ? description.slice(0, 20000) : "",
                location: typeof location === "string" ? location.slice(0, 300) : "",
                jobUrl,
                sourceUrl: jobUrl,
                companyLogo: logo || null,
                source: "extension",
                status,
            },
            select: { id: true, status: true },
        });

        return withCors(NextResponse.json({ ok: true, jobId: job.id, status: job.status, created: true }));
    } catch (error) {
        console.error("[EXTENSION_JOB_STATUS]", error);
        return withCors(NextResponse.json({ error: "Could not set the status." }, { status: 500 }));
    }
}
