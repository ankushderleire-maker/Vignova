import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getExtensionUser } from "@/lib/extensionAuth";
import { getTemplateGenerator } from "@/components/resume-html-templates";
import { generatePdfFromHtml } from "@/lib/pdf/puppeteer";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";
import { findExistingWork, findJobByUrl, duplicateResponse } from "@/lib/extensionDuplicate";
import { checkAiAccess } from "@/lib/extensionPlan";

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
 * 7. Deduct credit
 * 8. Return { resumeData, pdfBase64, jobId, resumeId }
 */
export async function POST(req: Request) {
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
        const { jobDescription, jobTitle, company, jobUrl, force = false, source = "EXTENSION" } = body;

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
        // the match score, job tracking and autofill.
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

        const masterProfile = profile.parsed_data as any;

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

        // ─── 7. Call AI Backend ───
        const AI_BACKEND_URL = process.env.AI_BACKEND_URL || "http://localhost:8000";

        const aiResponse = await fetch(`${AI_BACKEND_URL}/api/generate-tailored-resume`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jobDescription,
                masterProfile,
            }),
        });

        if (!aiResponse.ok) {
            // Update job status to failed
            await db.jobApplication.update({
                where: { id: job.id },
                data: { status: "SAVED" },
            });
            return withCors(NextResponse.json(
                { error: "AI resume generation failed. Please try again." },
                { status: 502 }
            ));
        }

        const aiResult = await aiResponse.json();
        const aiData = aiResult.data;

        // ─── 8. Format Resume Data ───
        const resumeData = {
            fullName: aiData.fullName || masterProfile.fullName,
            jobTitle: aiData.jobTitle || jobTitle,
            contact: {
                email: aiData.email || masterProfile.email,
                phone: aiData.phone || masterProfile.phone,
                location: aiData.location || masterProfile.location || "",
                linkedin: aiData.linkedin || masterProfile.linkedin || "",
                website: aiData.website || "",
                // The profile form collects a GitHub URL and every template can now
                // show one, but it was never copied into the contact block, so what
                // the user typed never reached the page.
                github: aiData.github || masterProfile.github || "",
            },
            summary: aiData.summary,
            skills: aiData.skills?.technical
                ? (Array.isArray(aiData.skills.technical)
                    ? aiData.skills.technical
                    : aiData.skills.technical.split(",").map((s: string) => s.trim()))
                : [],
            experience: aiData.experience?.map((exp: any) => ({
                id: exp.id || Math.random().toString(),
                company: exp.company,
                role: exp.role,
                startDate: exp.startDate,
                endDate: exp.endDate,
                description: Array.isArray(exp.description) ? exp.description : [exp.description],
                location: exp.location || "",
            })) || [],
            projects: aiData.projects
                ? aiData.projects.map((proj: any) => ({
                    id: proj.id || Math.random().toString(),
                    name: proj.name,
                    techStack: proj.techStack,
                    description: Array.isArray(proj.description) ? proj.description : [proj.description],
                    link: proj.link || "",
                }))
                : [],
            education: aiData.education?.map((edu: any) => ({
                id: edu.id || Math.random().toString(),
                school: edu.school,
                degree: edu.degree,
                field: edu.field,
                startDate: edu.startDate || "",
                endDate: edu.endDate || "",
            })) || [],
        };

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
            let templateId = "classic";
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

        // ─── 11. Deduct Credit (Atomic to prevent race conditions) ───
        await db.subscriptions.update({
            where: { id: subscription!.id },
            data: { credits_remaining: { decrement: 1 } },
        });

        // ─── 12. Update Job Status ───
        await db.jobApplication.update({
            where: { id: job.id },
            data: { status: "SAVED" }, // Standardize status for dashboard
        });

        return withCors(NextResponse.json({
            success: true,
            jobId: job.id,
            resumeId: savedResume.id,
            resumeData,
            pdfBase64,
            credits_remaining: subscription!.credits_remaining - 1,
        }));

    } catch (error) {
        console.error("[EXTENSION_GENERATE]", error);
        return withCors(NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        ));
    }
}
