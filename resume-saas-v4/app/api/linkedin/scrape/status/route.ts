import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { callBackend } from "@/lib/career-ops";

/**
 * POST /api/linkedin/scrape/status
 *
 * Polling endpoint for an in-flight scrape. Answers one of:
 *   { status: "RUNNING" }
 *   { status: "SUCCEEDED", result: <analysis> }   — already scored + stored
 *   { status: "FAILED", error }
 *
 * The analysis is stored against the session user, so a guessed runId can
 * never write into another account.
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

    const runId = typeof body?.runId === "string" ? body.runId.trim() : "";
    const linkedinUrl = typeof body?.linkedinUrl === "string" ? body.linkedinUrl.trim() : "";
    if (!runId || !linkedinUrl) {
        return NextResponse.json({ error: "Missing runId or linkedinUrl" }, { status: 400 });
    }

    const result = await callBackend<any>("/api/linkedin/scrape/status", {
        method: "POST",
        timeoutMs: 60_000,
        headers: { "X-Client-Id": userId },
        body: {
            userId,
            runId,
            linkedinUrl,
            masterProfileId: body?.masterProfileId || null,
        },
    });

    if (!result.ok) {
        return NextResponse.json(
            { error: result.error || "Could not check the scrape status." },
            { status: result.status || 500 }
        );
    }

    return NextResponse.json(result.data);
}
