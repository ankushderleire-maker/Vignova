import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { callBackend } from "@/lib/career-ops";
import { sanitizeLinkedInProfile } from "@/lib/linkedin-skills";
import { spendCredits, refundCredits } from "@/lib/credits";

export const maxDuration = 300;

/**
 * POST /api/linkedin/optimize
 *
 * Asks the backend for AI rewrites of the analysed profile. Sits in front of
 * the Python route so the internal API key stays server-side and the analysis
 * being rewritten is pinned to the session user.
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any = {};
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!body?.analysisId) {
        return NextResponse.json({ error: "Missing analysisId" }, { status: 400 });
    }

    // Metered against the writing bucket. This route called the model and
    // charged nothing, so profile rewrites were free on every plan while the
    // extension charged for a cover letter of similar cost. Reserved before
    // the call and refunded below if it fails.
    const spent = await spendCredits(userId, "writing");
    if (!spent.ok) {
        return NextResponse.json(
            { error: "You're out of writing credits.", bucket: "writing", outOfCredits: true },
            { status: 403 }
        );
    }

    const result = await callBackend<any>("/api/linkedin/optimize", {
        method: "POST",
        timeoutMs: 240_000,
        headers: { "X-Client-Id": userId },
        body: {
            userId,
            analysisId: body.analysisId,
            rawProfileData: body.rawProfileData || {},
            sectionScores: body.sectionScores || {},
            masterProfileId: body.masterProfileId || null,
        },
    });

    if (!result.ok) {
        await refundCredits(userId, "writing", "linkedin optimization failed");
        return NextResponse.json(
            { error: result.error || "AI optimization failed." },
            { status: result.status || 500 }
        );
    }

    return NextResponse.json({
        ...sanitizeLinkedInProfile(result.data),
        credits_remaining: spent.remaining,
    });
}
