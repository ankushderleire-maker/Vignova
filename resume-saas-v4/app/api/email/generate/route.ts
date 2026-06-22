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
    const email = masterProfile.email || masterProfile.contact?.email || "";
    const phone = masterProfile.phone || masterProfile.contact?.phone || "";

    const jdSnippet = jobDescription.substring(0, 3000);

    const AI_BACKEND_URL = process.env.AI_BACKEND_URL || "http://localhost:8000";
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
        const emailResult = await fetch(`${AI_BACKEND_URL}/api/generate-draft-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobDescription, masterProfile })
        });

        if (!emailResult.ok) {
            throw new Error("Failed to generate email");
        }

        const emData = await emailResult.json();
        const draftEmail = emData.response?.trim();

        // Deduct 1 credit
        await db.subscriptions.update({
            where: { id: sub.id },
            data: { credits_remaining: { decrement: 1 } },
        });

        return NextResponse.json({
            success: true,
            draftEmail,
            credits_remaining: sub.credits_remaining - 1
        });

    } catch (error) {
        console.error("[GENERATE_EMAIL]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
