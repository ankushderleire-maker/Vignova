import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getExtensionUser } from "@/lib/extensionAuth";
import { getTemplateGenerator } from "@/components/resume-html-templates";
import { generatePdfFromHtml } from "@/lib/pdf/puppeteer";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";
import { findExistingWork, findJobByUrl, duplicateResponse } from "@/lib/extensionDuplicate";
import { spendCredit, refundCredit } from "@/lib/credits";
import { checkAiAccess } from "@/lib/extensionPlan";
import { callBackend } from "@/lib/career-ops";
import { jsonObject } from "@/lib/extensionDashboard";
import { toResumeData } from "@/lib/tailoredResume";

export const maxDuration = 120;

// CORS preflight
export async function OPTIONS() {
    return handleCorsOptions();
}

/**
 * POST /api/extension/generate
 * Core endpoint: receives job description, generates tailored resume, returns PDF.
 *
 * Headers: Authorization: Bearer <token>
 * Body: { jobDescription, jobTitle, company, jobUrl?, source? }
 *
 * Flow:
 * 1. Verify token + check credits
 * 2. Fetch default master profile
 * 3. Save job to DB
 * 4. Call AI backend for tailored resume
 * 5. Format + save resume
 * 6. Generate PDF
 * A credit is reserved before generation and refunded on failure.
 * 7. Keep the reservation after successful persistence
 * 8. Return { resumeData, pdfBase64, jobId, resumeId }
 */
export async function POST(req: Request) {
    let reservedFor: string | null = null;
    try {
        // ─── 1. Auth Check ───
        const auth = await getExtensionUser(req);
        if (auth.error) {
            return withCors(NextResponse.json(
                { error: auth.error },
                { status: auth.status }
            ));
        }

        const { user, subscription } = auth;
        const userId = user!.id;

        // ─── 2. Validate Input ───
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
        // Tailoring calls a model, so it is Pro-and-up. Free accounts keep
        // the match score and job tracking.
        const denied = checkAiAccess(subscription, "Tailor Resume");
        if (denied) return denied;

        // ─── 5. Fetch Default Master Profile (fallback to any profile) ───
        let profile = await db.master_profiles.findFirst({
            where: {
                user_id: userId,
                is_default: true,
            },
        });

        // Fallback: if no default profile, use the first available profile
        if (!profile) {
            profile = await db.master_profiles.findFirst({
                where: { user_id: userId },
                orderBy: { created_at: "desc" },
            });
        }

        if (!profile || !profile.parsed_data) {
            return withCors(NextResponse.json(
                { error: "No default profile found. Please create a Master Profile on Vignova first." },
                { status: 404 }
            ));
        }

        const masterProfile = jsonObject(profile.parsed_data);
        const focus = typeof hint === "string" ? hint.trim().slice(0, 500) : "";
        const generationDescription = focus ? `${jobDescription}\n\nCandidate focus: ${focus}. Only emphasize facts supported by the profile.` : jobDescription;
        const spent = await spendCredit(userId);
        if (!spent.ok) return withCors(NextResponse.json({ error: "You're out of credits.", upgradeRequired: true, outOfCredits: true }, { status: 402 }));
        reservedFor = userId;

        // ─── 6. Save Job to DB ───
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

        // Call the authenticated shared AI service with the active profile.
        const aiResult = await callBackend<{ data: any }>("/api/generate-tailored-resume", {
            method: "POST", timeoutMs: 120000, headers: { "X-Client-Id": userId },
            body: { jobDescription: generationDescription, masterProfile },
        });
        if (!aiResult.ok || !aiResult.data?.data) {
            await db.jobApplication.update({ where: { id: job.id }, data: { status: "SAVED" } }).catch(() => {});
            await refundCredit(userId, "extension resume generation failed"); reservedFor = null;
            return withCors(NextResponse.json({ error: "AI resume generation failed. Please try again.", creditCharged: false }, { status: 502 }));
        }
        const aiData = aiResult.data.data;

        // ─── 8. Format Resume Data ───
        const resumeData = toResumeData(aiData, masterProfile, jobTitle);

        // ─── 9. Save Resume to DB ───
        const savedResume = await db.generatedResume.create({
            data: {
                userId,
                jobId: job.id,
                content: resumeData,
                name: `${company} - ${jobTitle} (Extension)`,
                source: "extension",
                sourceUrl: jobUrl || "",
            },
        });

        // ─── 10. Generate PDF ───
        let pdfBase64 = null;
        try {
            // Determine template based on extension settings
            let templateId = "signature";
            const settings = (user as any).extensionSettings;

            if (settings) {
                const { mode, templateId: specificId, templateIds } = settings;
                // Import AVAILABLE_TEMPLATES dynamically or hardcode list if needed (better to import)
                // For now we trust the inputs or default safely.

                if (mode === "specific" && specificId) {
                    templateId = specificId;
                } else if (mode === "curated" && Array.isArray(templateIds) && templateIds.length > 0) {
                    templateId = templateIds[Math.floor(Math.random() * templateIds.length)];
                } else if (mode === "random" || mode === "curated") { // Fallback for empty curated
                    // We need the list of all templates. 
                    // Since we can't easily import AVAILABLE_TEMPLATES here without circular deps or large imports,
                    // let's grab the keys from the generator map which is already imported.
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
            console.error("[EXTENSION_PDF_ERROR]", pdfError);
            // PDF generation failed but resume was still created - non-fatal
        }

        // ─── 11. Update Job Status ───
        // The generated output is saved; a status update failure should not lose it.
        await db.jobApplication.update({
            where: { id: job.id },
            data: { status: "SAVED" }, // Standardize status for dashboard
        }).catch((err) => console.error("[EXTENSION_GENERATE] status update failed", err));

        // Generated output is persisted; keep the reserved credit.
        reservedFor = null;

        return withCors(NextResponse.json({
            success: true,
            jobId: job.id,
            resumeId: savedResume.id,
            resumeData,
            pdfBase64,
            credits_remaining: spent.remaining,
        }));

    } catch (error) {
        if (reservedFor) await refundCredit(reservedFor, "extension generate failed");
        console.error("[EXTENSION_GENERATE]", error);
        return withCors(NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        ));
    }
}
