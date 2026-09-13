import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { callBackend } from "@/lib/career-ops";
import { creditBalance, outOfCreditsBody, refundCredits, refundMany, spendMany } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/planCatalog";

/** Same price as the extension's pack; see CREDIT_COSTS.applicationPack. */
const PACK_COST = CREDIT_COSTS.applicationPack;

export const maxDuration = 300;

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { jobDescription, masterProfile, atsReport } = body;
    
    if (!jobDescription || !masterProfile) {
        return NextResponse.json({ error: "Missing jobDescription or masterProfile" }, { status: 400 });
    }

    // Both credits are reserved up front, in one transaction. This used to
    // check only the tailoring balance, generate everything, and then charge
    // the pack without reading the result, so an account with no writing
    // credits failed that charge and got every pack for free.
    const spent = await spendMany(userId, PACK_COST);
    if (!spent.ok) {
        return NextResponse.json(outOfCreditsBody(spent.bucket, spent.remaining), { status: 403 });
    }
    let reservationOpen = true;

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
        // callBackend sends the internal API key the backend now requires.
        const [resumeResult, coverLetterResult, emailResult] = await Promise.all([
            callBackend<{ data?: unknown }>("/api/generate-tailored-resume", {
                method: "POST",
                body: { jobDescription, masterProfile, atsReport },
                timeoutMs: 280_000,
            }),
            callBackend<{ response?: string }>("/api/generate-cover-letter", {
                method: "POST",
                body: { jobDescription, masterProfile },
            }),
            callBackend<{ response?: string }>("/api/generate-draft-email", {
                method: "POST",
                body: { jobDescription, masterProfile },
            }),
        ]);

        const resumeData = resumeResult.ok ? resumeResult.data?.data ?? null : null;
        const coverLetter = coverLetterResult.ok ? coverLetterResult.data?.response?.trim() || null : null;
        const draftEmail = emailResult.ok ? emailResult.data?.response?.trim() || null : null;

        // Pay for what arrived. The reservation covered a resume and the
        // writing that goes with it; whichever half failed is handed back.
        reservationOpen = false;
        if (!resumeData) {
            console.error("[GENERATE_ALL] Resume failed:", resumeResult.status, resumeResult.error);
            await refundCredits(userId, "tailoring", "application pack: resume failed");
        }
        if (!coverLetter && !draftEmail) {
            await refundCredits(userId, "writing", "application pack: cover letter and email failed");
        }

        if (!resumeData && !coverLetter && !draftEmail) {
            return NextResponse.json(
                { error: "All generation tasks failed. No credits were used." },
                { status: 502 }
            );
        }

        return NextResponse.json({
            success: true,
            data: resumeData,
            coverLetter,
            draftEmail,
            credits_remaining: await creditBalance(userId, "tailoring"),
        });
    } catch (error) {
        if (reservationOpen) await refundMany(userId, PACK_COST, "application pack failed");
        console.error("[GENERATE_ALL]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
