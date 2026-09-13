import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toResumeData } from "@/lib/tailoredResume";
import { getExtensionUser } from "@/lib/extensionAuth";
import { getTemplateGenerator } from "@/components/resume-html-templates";
import { generatePdfFromHtml } from "@/lib/pdf/puppeteer";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";
import { findExistingWork, findJobByUrl, duplicateResponse } from "@/lib/extensionDuplicate";
import { spendMany, refundMany, getBalances } from "@/lib/credits";
import type { Bucket } from "@/lib/planLimits";

/**
 * What one application pack costs.
 *
 * A resume plus a cover letter plus an email is three generations, so it is
 * priced as a tailoring credit and a writing credit rather than one credit for
 * everything. spendMany takes both inside a transaction: taking the first and
 * failing on the second would charge for a pack that was never delivered.
 */
const PACK_COST: Partial<Record<Bucket, number>> = { tailoring: 1, writing: 1 };
import { checkAiAccess } from "@/lib/extensionPlan";
import { callBackend } from "@/lib/career-ops";
import { jsonObject } from "@/lib/extensionDashboard";

export const maxDuration = 120;

export async function OPTIONS() {
    return handleCorsOptions();
}

/**
 * POST /api/extension/generate-all
 * Generates Resume PDF + Cover Letter + Draft Email in a single request.
 * Costs 1 credit.
 *
 * Body: { jobDescription, jobTitle, company, jobUrl?, hint?, source? }
 * Returns: { pdfBase64, coverLetter, draftEmail, credits_remaining, ... }
 */
export async function POST(req: Request) {
    let reservedFor: string | null = null;
    try {
        // ─── 1. Auth ───
        const auth = await getExtensionUser(req);
        if (auth.error) {
            return withCors(NextResponse.json({ error: auth.error }, { status: auth.status }));
        }

        const { user, subscription } = auth;
        const userId = user!.id;

        // ─── 2. Input ───
        const body = await req.json();
        const { jobDescription, jobTitle, company, jobUrl, hint, force = false, source = "EXTENSION" } = body;

        if (!jobDescription || !jobTitle || !company) {
            return withCors(NextResponse.json(
                { error: "jobDescription, jobTitle, and company are required" },
                { status: 400 }
            ));
        }

        // ─── 3. Already generated? ───
        // Asked before the credit check so a repeat visit to a posting can
        // never cost a credit on its own. The extension turns this into a
        // "generate again?" prompt and retries with force: true.
        if (!force) {
            const existing = await findExistingWork(userId, jobUrl);
            if (existing) {
                return withCors(NextResponse.json(duplicateResponse(existing), { status: 409 }));
            }
        }

        // ─── 4. Plan and credits ───
        // The application pack calls a model three times, so it is
        // Pro-and-up. Free accounts keep the match score and tracking.
        const denied = await checkAiAccess(subscription, "Application Pack", ["tailoring", "writing"], userId);
        if (denied) return denied;

        // ─── 5. Profile ───
        let profile = await db.master_profiles.findFirst({
            where: { user_id: userId, is_default: true },
        });
        if (!profile) {
            profile = await db.master_profiles.findFirst({
                where: { user_id: userId },
                orderBy: { created_at: "desc" },
            });
        }
        if (!profile || !profile.parsed_data) {
            return withCors(NextResponse.json(
                { error: "No profile found. Create a Master Profile on Vignova first." },
                { status: 404 }
            ));
        }

        const masterProfile = jsonObject(profile.parsed_data);
        const focus = typeof hint === "string" ? hint.trim().slice(0, 500) : "";
        const generationDescription = focus ? `${jobDescription}\n\nCandidate focus: ${focus}. Only emphasize facts supported by the profile.` : jobDescription;
        const spent = await spendMany(userId, PACK_COST);
        if (!spent.ok) {
            return withCors(NextResponse.json({
                error: `You're out of ${spent.bucket} credits.`,
                bucket: spent.bucket,
                credits_remaining: spent.remaining,
                upgradeRequired: true,
                outOfCredits: true,
            }, { status: 402 }));
        }
        reservedFor = userId;

        // ─── 6. Save Job ───
        // Regenerating updates the row we already have. Creating a second one
        // would show the same posting twice in the tracker.
        const tracked = await findJobByUrl(userId, jobUrl);
        const job = tracked
            ? await db.jobApplication.update({
                where: { id: tracked.id },
                data: { company, jobTitle, description: jobDescription, status: "TAILORING" },
            })
            : await db.jobApplication.create({
                data: {
                    userId,
                    company,
                    jobTitle,
                    description: jobDescription,
                    jobUrl: jobUrl || "",
                    location: "",
                    status: "TAILORING",
                    source: "extension",
                    sourceUrl: jobUrl || "",
                },
            });

        // All outputs use the same configured AI backend and the active profile.
        const generationBody = { jobDescription: generationDescription, masterProfile };
        const [resumeResult, coverLetterResult, emailResult] = await Promise.allSettled([
            callBackend<any>("/api/generate-tailored-resume", { method: "POST", timeoutMs: 120000, body: generationBody, headers: { "X-Client-Id": userId } }),
            callBackend<{ response: string }>("/api/generate-cover-letter", { method: "POST", timeoutMs: 90000, body: generationBody, headers: { "X-Client-Id": userId } }),
            callBackend<{ response: string }>("/api/generate-draft-email", { method: "POST", timeoutMs: 90000, body: generationBody, headers: { "X-Client-Id": userId } }),
        ]);

        // ─── 9. Process resume result ───
        let pdfBase64 = null;
        let resumeData = null;
        let savedResume = null;

        if (resumeResult.status === "fulfilled" && resumeResult.value.ok && resumeResult.value.data?.data) {
            const aiResult = resumeResult.value.data;
            const aiData = aiResult.data;

            resumeData = toResumeData(aiData, masterProfile, jobTitle);

            // Save resume to DB
            savedResume = await db.generatedResume.create({
                data: {
                    userId,
                    jobId: job.id,
                    content: resumeData,
                    name: `${company} - ${jobTitle} (Extension)`,
                    source: "extension",
                    sourceUrl: jobUrl || "",
                },
            });

            // Generate PDF
            try {
                let templateId = "signature";
                const settings = (user as any).extensionSettings;
                if (settings) {
                    const { mode, templateId: specificId, templateIds } = settings;
                    if (mode === "specific" && specificId) {
                        templateId = specificId;
                    } else if (mode === "curated" && Array.isArray(templateIds) && templateIds.length > 0) {
                        templateId = templateIds[Math.floor(Math.random() * templateIds.length)];
                    } else if (mode === "random" || mode === "curated") {
                        const generatorMap = require("@/components/resume-html-templates").HTML_TEMPLATE_GENERATORS;
                        const allTemplates = Object.keys(generatorMap);
                        templateId = allTemplates[Math.floor(Math.random() * allTemplates.length)];
                    }
                }
                const generator = getTemplateGenerator(templateId) || getTemplateGenerator("classic");
                const html = generator(resumeData);
                const pdfBuffer = await generatePdfFromHtml(html);
                pdfBase64 = pdfBuffer.toString("base64");
            } catch (pdfError) {
                console.error("[GENERATE_ALL_PDF_ERROR]", pdfError);
            }
        } else {
            console.error("[GENERATE_ALL_RESUME_FAILED]", resumeResult.status === "rejected" ? resumeResult.reason : "Non-OK response");
        }

        // ─── 10. Process cover letter result ───
        let coverLetter = null;
        if (coverLetterResult.status === "fulfilled" && coverLetterResult.value.ok) {
            const clData = coverLetterResult.value.data;
            coverLetter = clData?.response?.trim() || null;
        }

        // ─── 11. Process email result ───
        let draftEmail = null;
        if (emailResult.status === "fulfilled" && emailResult.value.ok) {
            const emData = emailResult.value.data;
            draftEmail = emData?.response?.trim() || null;
        }

        // ─── 12. Save cover letter and email to the job ───
        // The email used to be returned and forgotten, so closing the overlay
        // lost it. Stored now, which is also what makes the duplicate check
        // above able to see it.
        if (coverLetter || draftEmail) {
            await db.jobApplication.update({
                where: { id: job.id },
                data: {
                    ...(coverLetter ? { coverLetter } : {}),
                    ...(draftEmail ? { draftEmail } : {}),
                },
            });
        }

        // ─── 13. Nothing came back? Charge nothing. ───
        // This check used to sit *after* the deduction, so a run where all
        // three generations failed still cost a credit and then answered
        // 502.
        if (!resumeData && !coverLetter && !draftEmail) {
            await refundMany(userId, PACK_COST, "extension application pack generation failed"); reservedFor = null;
            await db.jobApplication.update({
                where: { id: job.id },
                data: { status: "SAVED" },
            }).catch(() => { /* the job row is not worth failing over here */ });

            return withCors(NextResponse.json(
                {
                    error: "We could not generate anything for this job. No credit was used.",
                    creditCharged: false,
                },
                { status: 502 }
            ));
        }

        // ─── 14. Update job status ───
        // The generated output is saved; a status update failure should not lose it.
        await db.jobApplication.update({
            where: { id: job.id },
            data: { status: "SAVED" },
        }).catch((err) => console.error("[EXTENSION_GENERATE_ALL] status update failed", err));

        // At least one output is saved; keep the reserved credit.
        reservedFor = null;

        const balances = await getBalances(userId);

        return withCors(NextResponse.json({
            success: true,
            jobId: job.id,
            resumeId: savedResume?.id || null,
            resumeData,
            pdfBase64,
            coverLetter,
            draftEmail,
            // Legacy field the installed extension still reads, plus the full
            // per-bucket picture for the usage panel.
            credits_remaining: balances.buckets.find(b => b.bucket === "tailoring")?.remaining ?? 0,
            credits: balances,
        }));

    } catch (error) {
        if (reservedFor) await refundMany(reservedFor, PACK_COST, "extension generate-all failed");
        console.error("[GENERATE_ALL]", error);
        return withCors(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
    }
}
