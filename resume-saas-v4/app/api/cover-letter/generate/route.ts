import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { callBackend } from "@/lib/career-ops";
import { outOfCreditsBody, refundCredits, spendCredits } from "@/lib/credits";

export const maxDuration = 300;

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { jobDescription, masterProfile } = body;
    
    if (!jobDescription || !masterProfile) {
        return NextResponse.json({ error: "Missing jobDescription or masterProfile" }, { status: 400 });
    }

    // Reserved before the model runs and handed back below if nothing usable
    // comes out. Checking the balance first and charging at the end let
    // requests sent together all pass the check on the last credit.
    const spent = await spendCredits(userId, "writing");
    if (!spent.ok) {
        return NextResponse.json(outOfCreditsBody("writing", spent.remaining), { status: 403 });
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
        // callBackend sends the internal API key the backend now requires.
        const result = await callBackend<{ response?: string }>("/api/generate-cover-letter", {
            method: "POST",
            body: { jobDescription, masterProfile },
        });
        const coverLetter = result.ok ? result.data?.response?.trim() : null;

        // A failed call and an ok response with nothing in it are both
        // failures, and neither costs anything.
        if (!coverLetter) {
            await refundCredits(userId, "writing", "cover letter generation failed");
            console.error("[GENERATE_COVER_LETTER] Backend returned", result.status, result.error);
            return NextResponse.json(
                { error: "The cover letter could not be generated. No credit was used.", creditCharged: false },
                { status: 502 }
            );
        }

        return NextResponse.json({
            success: true,
            coverLetter,
            credits_remaining: spent.remaining,
        });
    } catch (error) {
        await refundCredits(userId, "writing", "cover letter generation threw");
        console.error("[GENERATE_COVER_LETTER]", error);
        return NextResponse.json({ error: "Internal server error. No credit was used." }, { status: 500 });
    }
}
