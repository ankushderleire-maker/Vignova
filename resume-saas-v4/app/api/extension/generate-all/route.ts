import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getExtensionUser } from "@/lib/extensionAuth";
import { getTemplateGenerator } from "@/components/resume-html-templates";
import { generatePdfFromHtml } from "@/lib/pdf/puppeteer";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";

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
        const { jobDescription, jobTitle, company, jobUrl, hint, source = "EXTENSION" } = body;

        if (!jobDescription || !jobTitle || !company) {
            return withCors(NextResponse.json(
                { error: "jobDescription, jobTitle, and company are required" },
                { status: 400 }
            ));
        }

        // ─── 3. Credits ───
        if (subscription!.credits_remaining <= 0) {
            return withCors(NextResponse.json(
                { error: "Insufficient credits. Please upgrade or wait for reset.", credits_remaining: 0 },
                { status: 403 }
            ));
        }

        // ─── 4. Profile ───
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

        const masterProfile = profile.parsed_data as any;

        // ─── 5. Save Job ───
        const job = await db.jobApplication.create({
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

        // ─── 6. Build profile context (shared by cover letter & email) ───
        const fullName = `${masterProfile.first_name || masterProfile.fullName || ""} ${masterProfile.last_name || ""}`.trim();
        const currentTitle = masterProfile.experience?.[0]?.role || masterProfile.experience?.[0]?.title || "";
        const currentCompany = masterProfile.experience?.[0]?.company || "";
        const email = masterProfile.email || masterProfile.contact?.email || "";
        const phone = masterProfile.phone || masterProfile.contact?.phone || "";

        const skillsList = Array.isArray(masterProfile.skills)
            ? masterProfile.skills.join(", ")
            : typeof masterProfile.skills === "string"
                ? masterProfile.skills
                : typeof masterProfile.skills === "object" && masterProfile.skills?.technical
                    ? (Array.isArray(masterProfile.skills.technical) ? masterProfile.skills.technical.join(", ") : masterProfile.skills.technical)
                    : "";

        const experienceSummary = Array.isArray(masterProfile.experience)
            ? masterProfile.experience.slice(0, 3).map((e: any) => `${e.role || e.title || ""} at ${e.company || ""}`).join("; ")
            : "";

        const educationSummary = Array.isArray(masterProfile.education)
            ? masterProfile.education.map((e: any) => `${e.degree || ""} from ${e.school || ""}`).join("; ")
            : "";

        // ─── 7. Parallel generation: Resume + Cover Letter + Email ───
        const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
        const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
        const AI_BACKEND_URL = process.env.AI_BACKEND_URL || "http://localhost:8000";

        const jdSnippet = jobDescription.substring(0, 3000);

        // Cover letter prompt
        const coverLetterPrompt = `Write a professional, compelling cover letter for the following job application.

APPLICANT:
Name: ${fullName}
Current Role: ${currentTitle} at ${currentCompany}
Skills: ${skillsList}
Experience: ${experienceSummary}
Education: ${educationSummary}

JOB:
Title: ${jobTitle || "the position"}
Company: ${company || "the company"}
Description: ${jdSnippet}

INSTRUCTIONS:
- Write a professional cover letter (3-4 paragraphs)
- Highlight relevant skills and experience that match the job description
- Show enthusiasm and cultural fit
- Keep it concise (250-350 words)
- Do NOT include addresses or date headers
- Start with "Dear Hiring Manager," or similar
- End with a professional closing
- Output ONLY the cover letter text, no extra commentary`;

        // Email prompt
        const emailPrompt = `Write a concise, professional application email for the following job.

APPLICANT:
Name: ${fullName}
Current Role: ${currentTitle} at ${currentCompany}
Email: ${email}
Phone: ${phone}

JOB:
Title: ${jobTitle || "the position"}
Company: ${company || "the company"}
Description: ${jdSnippet}

INSTRUCTIONS:
- Write a short, professional email (150-200 words) to apply for this job
- Subject line format: "Application for [Job Title] — [Your Name]"
- Start with a brief, engaging opening
- Mention 2-3 key qualifications that match
- Express enthusiasm for the role
- Close professionally with contact info
- Format it as:
  Subject: ...
  
  [email body]
  
  Best regards,
  ${fullName}
  ${email}${phone ? "\n  " + phone : ""}
- Output ONLY the email, no extra commentary`;

        // Run all 3 in parallel
        const [resumeResult, coverLetterResult, emailResult] = await Promise.allSettled([
            // Resume generation (via AI backend)
            fetch(`${AI_BACKEND_URL}/api/generate-tailored-resume`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobDescription, masterProfile }),
            }),
            // Cover letter (via Ollama)
            fetch(`${OLLAMA_BASE_URL}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: OLLAMA_MODEL,
                    prompt: coverLetterPrompt,
                    stream: false,
                    options: { temperature: 0.7, num_predict: 800 },
                }),
            }),
            // Email draft (via Ollama)
            fetch(`${OLLAMA_BASE_URL}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: OLLAMA_MODEL,
                    prompt: emailPrompt,
                    stream: false,
                    options: { temperature: 0.7, num_predict: 500 },
                }),
            }),
        ]);

        // ─── 8. Process resume result ───
        let pdfBase64 = null;
        let resumeData = null;
        let savedResume = null;

        if (resumeResult.status === "fulfilled" && resumeResult.value.ok) {
            const aiResult = await resumeResult.value.json();
            const aiData = aiResult.data;

            resumeData = {
                fullName: aiData.fullName || masterProfile.fullName,
                jobTitle: aiData.jobTitle || jobTitle,
                contact: {
                    email: aiData.email || masterProfile.email,
                    phone: aiData.phone || masterProfile.phone,
                    location: aiData.location || masterProfile.location || "",
                    linkedin: aiData.linkedin || masterProfile.linkedin || "",
                    website: aiData.website || "",
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
                let templateId = "classic";
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

        // ─── 9. Process cover letter result ───
        let coverLetter = null;
        if (coverLetterResult.status === "fulfilled" && coverLetterResult.value.ok) {
            const clData = await coverLetterResult.value.json();
            coverLetter = clData.response?.trim() || null;
        }

        // ─── 10. Process email result ───
        let draftEmail = null;
        if (emailResult.status === "fulfilled" && emailResult.value.ok) {
            const emData = await emailResult.value.json();
            draftEmail = emData.response?.trim() || null;
        }

        // ─── 11. Save cover letter to job ───
        if (coverLetter) {
            await db.jobApplication.update({
                where: { id: job.id },
                data: { coverLetter },
            });
        }

        // ─── 12. Deduct 1 credit ───
        await db.subscriptions.update({
            where: { id: subscription!.id },
            data: { credits_remaining: { decrement: 1 } },
        });

        // ─── 13. Update job status ───
        await db.jobApplication.update({
            where: { id: job.id },
            data: { status: "SAVED" },
        });

        // At least the resume must have succeeded
        if (!resumeData && !coverLetter && !draftEmail) {
            return withCors(NextResponse.json(
                { error: "All generation tasks failed. Please try again." },
                { status: 502 }
            ));
        }

        return withCors(NextResponse.json({
            success: true,
            jobId: job.id,
            resumeId: savedResume?.id || null,
            resumeData,
            pdfBase64,
            coverLetter,
            draftEmail,
            credits_remaining: subscription!.credits_remaining - 1,
        }));

    } catch (error) {
        console.error("[GENERATE_ALL]", error);
        return withCors(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
    }
}
