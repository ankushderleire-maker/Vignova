import { NextResponse } from "next/server";
import { getExtensionUser } from "@/lib/extensionAuth";
import { db } from "@/lib/db";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";

export const OPTIONS = handleCorsOptions;

export async function POST(req: Request) {
    try {
        const auth = await getExtensionUser(req);
        if (auth.error || !auth.user) {
            return withCors(NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 }));
        }
        const user = auth.user;

        const body = await req.json();
        const { jobTitle, company, jobUrl, description } = body;

        if (!description || description.length < 50) {
            return withCors(NextResponse.json({ error: "Job description too short" }, { status: 400 }));
        }

        // Fetch user's primary profile
        const profiles = await db.master_profiles.findMany({
            where: { user_id: user.id },
            orderBy: { updated_at: "desc" },
        });

        const profile = profiles.find((p) => p.is_default) || profiles[0];

        if (!profile || !profile.parsed_data) {
            return withCors(NextResponse.json({ error: "No profile found" }, { status: 404 }));
        }

        let data = profile.parsed_data as any;

        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch (e) {
                data = {};
            }
        }

        // Build user context
        const fullName = `${data.first_name || ""} ${data.last_name || ""}`.trim();
        const currentTitle = data.experience?.[0]?.role || data.experience?.[0]?.title || "";
        const currentCompany = data.experience?.[0]?.company || "";
        const skills = Array.isArray(data.skills)
            ? data.skills.join(", ")
            : typeof data.skills === "string"
                ? data.skills
                : typeof data.skills === "object" && data.skills?.technical
                    ? (Array.isArray(data.skills.technical) ? data.skills.technical.join(", ") : data.skills.technical)
                    : "";

        const experience = Array.isArray(data.experience)
            ? data.experience.slice(0, 3).map((e: any) => `${e.role || e.title || ""} at ${e.company || ""}`).join("; ")
            : "";

        const education = Array.isArray(data.education)
            ? data.education.map((e: any) => `${e.degree || ""} from ${e.school || ""}`).join("; ")
            : "";

        // Generate cover letter using Ollama
        const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
        const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

        const prompt = `Write a professional, compelling cover letter for the following job application.

APPLICANT:
Name: ${fullName}
Current Role: ${currentTitle} at ${currentCompany}
Skills: ${skills}
Experience: ${experience}
Education: ${education}

JOB:
Title: ${jobTitle || "the position"}
Company: ${company || "the company"}
Description: ${description.substring(0, 3000)}

INSTRUCTIONS:
- Write a professional cover letter (3-4 paragraphs)
- Highlight relevant skills and experience that match the job description
- Show enthusiasm and cultural fit
- Keep it concise (250-350 words)
- Do NOT include addresses or date headers
- Start with "Dear Hiring Manager," or similar
- End with a professional closing
- Output ONLY the cover letter text, no extra commentary`;

        const ollamaRes = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt,
                stream: false,
                options: { temperature: 0.7, num_predict: 800 },
            }),
        });

        if (!ollamaRes.ok) {
            const err = await ollamaRes.text();
            console.error("[COVER_LETTER] Ollama error:", err);
            return withCors(NextResponse.json({ error: "AI generation failed" }, { status: 500 }));
        }

        const ollamaData = await ollamaRes.json();
        const coverLetter = ollamaData.response?.trim() || "";

        if (!coverLetter) {
            return withCors(NextResponse.json({ error: "Empty response from AI" }, { status: 500 }));
        }

        // Save or update the job with cover letter
        let job;
        if (jobUrl) {
            job = await db.jobApplication.findFirst({
                where: { userId: user.id, jobUrl },
            });
        }

        if (job) {
            // Update existing job with cover letter
            job = await db.jobApplication.update({
                where: { id: job.id },
                data: { coverLetter },
            });
        } else {
            // Create new job with cover letter
            job = await db.jobApplication.create({
                data: {
                    userId: user.id,
                    jobTitle: jobTitle || "Untitled Position",
                    company: company || "Unknown Company",
                    jobUrl,
                    description: description.substring(0, 5000),
                    coverLetter,
                    source: "extension",
                    sourceUrl: jobUrl,
                    status: "SAVED",
                },
            });
        }

        return withCors(NextResponse.json({
            success: true,
            jobId: job.id,
            coverLetter,
            message: "Cover letter generated and saved",
        }));

    } catch (error) {
        console.error("[COVER_LETTER]", error);
        return withCors(NextResponse.json({ error: "Internal Error" }, { status: 500 }));
    }
}
