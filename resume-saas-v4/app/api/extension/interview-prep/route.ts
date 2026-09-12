import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getExtensionUser } from "@/lib/extensionAuth";
import { checkAiAccess } from "@/lib/extensionPlan";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";
import { activeExtensionProfile, jsonObject } from "@/lib/extensionDashboard";
import { callBackend } from "@/lib/career-ops";
import { spendCredit, refundCredit } from "@/lib/credits";

export const OPTIONS = handleCorsOptions;
export const maxDuration = 120;

export async function POST(req: Request) {
    let reservedFor: string | null = null;
    try {
        const auth = await getExtensionUser(req);
        if (auth.error || !auth.user) return withCors(NextResponse.json({ error: auth.error }, { status: auth.status }));
        const denied = checkAiAccess(auth.subscription, "Interview Prep");
        if (denied) return denied;
        const body = await req.json().catch(() => null);
        if (!body || typeof body.jobTitle !== "string" || !body.jobTitle.trim() || body.jobTitle.length > 200 ||
            typeof body.jobDescription !== "string" || body.jobDescription.trim().length < 50 || body.jobDescription.length > 20000 ||
            (body.company !== undefined && (typeof body.company !== "string" || body.company.length > 200))) {
            return withCors(NextResponse.json({ error: "Enter a job title and a description between 50 and 20,000 characters." }, { status: 400 }));
        }
        const profile = await activeExtensionProfile(auth.user.id);
        if (!profile) return withCors(NextResponse.json({ error: "Create a Master Profile before starting interview prep." }, { status: 404 }));
        // Claim the credit before invoking the model, so concurrent requests cannot run for free.
        const spent = await spendCredit(auth.user.id);
        if (!spent.ok) return withCors(NextResponse.json({ error: "You're out of credits.", upgradeRequired: true, outOfCredits: true }, { status: 402 }));
        reservedFor = auth.user.id;
        const result = await callBackend<{ questions: { question: string; tip?: string; type?: string }[] }>("/api/interview/questions", {
            method: "POST", timeoutMs: 90000, headers: { "X-Client-Id": auth.user.id },
            body: { job_title: body.jobTitle, company: body.company || "", job_description: body.jobDescription,
                num_questions: 7, user_profile: jsonObject(profile.parsed_data) },
        });
        const questions = result.data?.questions;
        if (!result.ok || !Array.isArray(questions) || !questions.length ||
            questions.some(q => !q || typeof q.question !== "string" || !q.question.trim())) {
            throw new Error("The interview service could not generate questions. Please try again.");
        }
        const saved = await db.savedInterview.create({ data: { userId: auth.user.id, source: "extension", questions } });
        reservedFor = null;
        return withCors(NextResponse.json({ success: true, questions, interviewId: saved.id, credits_remaining: spent.remaining }));
    } catch (error) {
        if (reservedFor) await refundCredit(reservedFor, "extension interview generation failed");
        console.error("[EXTENSION_INTERVIEW]", error);
        return withCors(NextResponse.json({ error: "Interview prep could not finish. Any reserved credit has been refunded; please try again." }, { status: 502 }));
    }
}
