import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export const maxDuration = 300;

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Check credits
    const sub = await db.subscriptions.findFirst({ where: { user_id: userId } });
    if (!sub || sub.credits_remaining <= 0) {
        return NextResponse.json({ error: "Insufficient Credits" }, { status: 403 });
    }

    const body = await req.json();
    const { jobDescription, masterProfile } = body;
    
    if (!jobDescription || !masterProfile) {
        return NextResponse.json({ error: "Missing jobDescription or masterProfile" }, { status: 400 });
    }

    // Extract fields for prompts
    const fullName = `${masterProfile.first_name || masterProfile.fullName || ""} ${masterProfile.last_name || ""}`.trim();
    const currentTitle = masterProfile.experience?.[0]?.role || masterProfile.experience?.[0]?.title || "";
    const currentCompany = masterProfile.experience?.[0]?.company || "";

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

    const jdSnippet = jobDescription.substring(0, 3000);

    const AI_BACKEND_URL = process.env.AI_BACKEND_URL || "http://localhost:8000";
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

    const coverLetterPrompt = `Write a professional, compelling cover letter for the following job application.

APPLICANT:
Name: ${fullName}
Current Role: ${currentTitle} at ${currentCompany}
Skills: ${skillsList}
Experience: ${experienceSummary}
Education: ${educationSummary}

JOB DESCRIPTION:
${jdSnippet}

INSTRUCTIONS:
- Write a professional cover letter (3-4 paragraphs)
- Highlight relevant skills and experience that match the job description
- Show enthusiasm and cultural fit
- Keep it concise (250-350 words)
- Do NOT include addresses or date headers
- Start with "Dear Hiring Manager," or similar
- End with a professional closing
- Output ONLY the cover letter text, no extra commentary`;

    try {
        const coverLetterResult = await fetch(`${AI_BACKEND_URL}/api/generate-cover-letter`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobDescription, masterProfile })
        });

        if (!coverLetterResult.ok) {
            throw new Error("Failed to generate cover letter");
        }

        const clData = await coverLetterResult.json();
        const coverLetter = clData.response?.trim();

        // Deduct 1 credit
        await db.subscriptions.update({
            where: { id: sub.id },
            data: { credits_remaining: { decrement: 1 } },
        });

        return NextResponse.json({
            success: true,
            coverLetter,
            credits_remaining: sub.credits_remaining - 1
        });

    } catch (error) {
        console.error("[GENERATE_COVER_LETTER]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
