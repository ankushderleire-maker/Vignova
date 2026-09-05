import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { callBackend } from "@/lib/career-ops";

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
        return NextResponse.json(
            { error: result.error || "AI optimization failed." },
            { status: result.status || 500 }
        );
    }

    return NextResponse.json(result.data);
}
