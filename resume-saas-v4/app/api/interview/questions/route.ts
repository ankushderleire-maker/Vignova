import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { callBackend } from "@/lib/career-ops";
import { ensurePeriod, notOnPlanBody, outOfCreditsBody, refundCredits, spendCredits } from "@/lib/credits";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // A plan can switch interview prep off in /admin/plans, and the pricing
    // page shows that switch, so it is enforced here too.
    const limits = await ensurePeriod(userId);
    if (!limits.has_interview_prep) {
        return NextResponse.json(notOnPlanBody("Interview prep", limits.plan_type), { status: 403 });
    }

    // Fetch user's master profile to personalise questions
    let userProfile: any = null;
    try {
        const whereClause: any = { user_id: userId };
        if (body.profileId) {
            whereClause.id = body.profileId;
        } else {
            whereClause.is_default = true;
        }
        
        let profileRow = await db.master_profiles.findFirst({
            where: whereClause,
        });

        if (!profileRow && !body.profileId) {
            profileRow = await db.master_profiles.findFirst({
                where: { user_id: userId },
                orderBy: { updated_at: "desc" },
            });
        }
        
        userProfile = profileRow?.parsed_data ?? null;
    } catch (_) {}

    // Metered against the interview bucket. The extension's interview route
    // already charged a credit while this one — the same generation, reached
    // from the dashboard — was free, so anyone could route around the charge.
    // One credit buys a whole set of questions for one job.
    const spent = await spendCredits(userId, "interview");
    if (!spent.ok) {
        return NextResponse.json(outOfCreditsBody("interview", spent.remaining), { status: 403 });
    }

    // callBackend sends the internal API key the backend now requires.
    const result = await callBackend<{ questions?: Prisma.InputJsonValue[] }>("/api/interview/questions", {
        method: "POST",
        body: { ...body, user_profile: userProfile },
        timeoutMs: 55_000,
        headers: { "X-Client-Id": userId },
    });
    const questions = result.ok ? result.data?.questions : undefined;

    // Nothing usable came back: charge nothing.
    if (!Array.isArray(questions) || questions.length === 0) {
        await refundCredits(userId, "interview", "interview questions generation failed");
        return NextResponse.json(
            { error: result.error || "The AI returned no questions. No credit was used, please try again." },
            { status: result.ok || result.status >= 500 ? 502 : result.status }
        );
    }

    // Save the set so it shows up in the interview history.
    try {
        await db.savedInterview.create({
            data: {
                userId,
                jobId: body.jobId || null,
                source: body.source || "profile",
                questions,
            },
        });
    } catch (err) {
        console.error("Failed to save interview questions to DB:", err);
        // We don't fail the request if saving fails
    }

    return NextResponse.json({ ...result.data, credits_remaining: spent.remaining });
}
