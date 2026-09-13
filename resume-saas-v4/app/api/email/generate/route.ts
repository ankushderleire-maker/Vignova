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
    const email = masterProfile.email || masterProfile.contact?.email || "";
    const phone = masterProfile.phone || masterProfile.contact?.phone || "";

    const jdSnippet = jobDescription.substring(0, 3000);

    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

    const emailPrompt = `Write a concise, professional application email for the following job.

APPLICANT:
Name: ${fullName}
Current Role: ${currentTitle} at ${currentCompany}
Email: ${email}
Phone: ${phone}

JOB DESCRIPTION:
${jdSnippet}

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

    try {
        // callBackend sends the internal API key the backend now requires.
        const result = await callBackend<{ response?: string }>("/api/generate-draft-email", {
            method: "POST",
            body: { jobDescription, masterProfile },
        });
        const draftEmail = result.ok ? result.data?.response?.trim() : null;

        // A failed call and an ok response with nothing in it are both
        // failures, and neither costs anything.
        if (!draftEmail) {
            await refundCredits(userId, "writing", "application email generation failed");
            console.error("[GENERATE_EMAIL] Backend returned", result.status, result.error);
            return NextResponse.json(
                { error: "The email could not be generated. No credit was used.", creditCharged: false },
                { status: 502 }
            );
        }

        return NextResponse.json({
            success: true,
            draftEmail,
            credits_remaining: spent.remaining,
        });
    } catch (error) {
        await refundCredits(userId, "writing", "application email generation threw");
        console.error("[GENERATE_EMAIL]", error);
        return NextResponse.json({ error: "Internal server error. No credit was used." }, { status: 500 });
    }
}
