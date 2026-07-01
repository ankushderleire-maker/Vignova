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
    const { jobDescription, masterProfile, atsReport } = body;
    
    if (!jobDescription || !masterProfile) {
        return NextResponse.json({ error: "Missing jobDescription or masterProfile" }, { status: 400 });
    }

    // Extract fields for prompts
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

    const jdSnippet = jobDescription.substring(0, 3000);

    
    const AI_BACKEND_URL = process.env.AI_BACKEND_URL || "http://localhost:8000";

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
        const [resumeResult, coverLetterResult, emailResult] = await Promise.allSettled([
            fetch(`${AI_BACKEND_URL}/api/generate-tailored-resume`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobDescription, masterProfile, atsReport }),
                // @ts-ignore
                signal: AbortSignal.timeout(280_000),
            }),
            fetch(`${AI_BACKEND_URL}/api/generate-cover-letter`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobDescription, masterProfile }),
            }),
            fetch(`${AI_BACKEND_URL}/api/generate-draft-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobDescription, masterProfile }),
            })
        ]);

        let resumeData = null;
        let coverLetter = null;
        let draftEmail = null;

        if (resumeResult.status === "fulfilled" && resumeResult.value.ok) {
            const aiResult = await resumeResult.value.json();
            resumeData = aiResult.data;
        } else {
            console.error("[GENERATE_ALL] Resume failed:", resumeResult.status === "rejected" ? resumeResult.reason : "HTTP Error");
        }

        if (coverLetterResult.status === "fulfilled" && coverLetterResult.value.ok) {
            const clData = await coverLetterResult.value.json();
            coverLetter = clData.response?.trim() || null;
        }

        if (emailResult.status === "fulfilled" && emailResult.value.ok) {
            const emData = await emailResult.value.json();
            draftEmail = emData.response?.trim() || null;
        }

        if (!resumeData && !coverLetter && !draftEmail) {
            return NextResponse.json({ error: "All generation tasks failed." }, { status: 502 });
        }

        // Deduct 1 credit
        await db.subscriptions.update({
            where: { id: sub.id },
            data: { credits_remaining: { decrement: 1 } },
        });

        return NextResponse.json({
            success: true,
            data: resumeData,
            coverLetter,
            draftEmail,
            credits_remaining: sub.credits_remaining - 1
        });

    } catch (error) {
        console.error("[GENERATE_ALL]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
