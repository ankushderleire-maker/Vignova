import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { callBackend } from "@/lib/career-ops";
import { ensurePeriod, notOnPlanBody, outOfCreditsBody, refundCredits, spendCredits } from "@/lib/credits";
import { isPaidPlan } from "@/lib/planCatalog";

export const maxDuration = 120;

/**
 * POST /api/ats/insights
 *
 * The AI narrative on top of an ATS score: bullet rewrites, keyword placement
 * and an action plan. Pro and Premium only, one tailoring credit each.
 *
 * Body: { jdText, resumeText, atsScores }
 *
 * The ATS page used to reserve a credit through /api/credits/deduct and then
 * call the model through the generic /api/python proxy. Both steps ran in the
 * browser, so skipping the first got the report for free, and the reservation
 * only came from the tailoring bucket because nothing told it otherwise. The
 * plan check, the charge and the model call now happen together, server-side.
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { jdText?: unknown; resumeText?: unknown; atsScores?: unknown } | null;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const jdText = typeof body?.jdText === "string" ? body.jdText : "";
    const resumeText = typeof body?.resumeText === "string" ? body.resumeText : "";
    const atsScores = body?.atsScores;
    if (!jdText.trim() || !resumeText.trim() || !atsScores || typeof atsScores !== "object") {
        return NextResponse.json(
            { error: "Run the ATS analysis first, then ask for AI insights." },
            { status: 400 }
        );
    }

    const limits = await ensurePeriod(userId);
    if (!isPaidPlan(limits.plan_type)) {
        return NextResponse.json(notOnPlanBody("AI ATS insights", limits.plan_type), { status: 403 });
    }

    const spent = await spendCredits(userId, "tailoring");
    if (!spent.ok) {
        return NextResponse.json(outOfCreditsBody("tailoring", spent.remaining), { status: 403 });
    }

    const result = await callBackend<Record<string, unknown>>("/api/enhance-ats-report", {
        method: "POST",
        form: {
            jd_text: jdText,
            resume_text: resumeText,
            ats_scores: JSON.stringify(atsScores),
        },
        timeoutMs: 110_000,
        headers: { "X-Client-Id": userId },
    });

    if (!result.ok || !result.data || typeof result.data !== "object") {
        await refundCredits(userId, "tailoring", "ats insights generation failed");
        console.error("[ATS_INSIGHTS] Backend returned", result.status, result.error);
        return NextResponse.json(
            { error: "AI insights could not be generated. No credit was used, please try again." },
            { status: 502 }
        );
    }

    return NextResponse.json({ report: result.data, credits_remaining: spent.remaining });
}
