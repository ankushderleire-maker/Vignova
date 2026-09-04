import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { callBackend } from "@/lib/career-ops";

/**
 * POST /api/linkedin/scrape
 *
 * Starts a LinkedIn profile scrape. The browser only ever talks to this route —
 * the Apify token lives on the Python backend, so nothing about the scraping
 * provider is reachable from the client.
 *
 * Returns { runId } straight away; the page then polls
 * /api/linkedin/scrape/status while it plays the fetching animation.
 *
 * Security: NextAuth session required, and userId is taken from the session
 * rather than the request body so a caller can't file an analysis under
 * someone else's account.
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

    const linkedinUrl = typeof body?.linkedinUrl === "string" ? body.linkedinUrl.trim() : "";
    if (!linkedinUrl) {
        return NextResponse.json({ error: "LinkedIn profile URL is required." }, { status: 400 });
    }

    const result = await callBackend<any>("/api/linkedin/scrape", {
        method: "POST",
        timeoutMs: 30_000,
        // Lets the backend rate-limit per user instead of per (shared) server IP.
        headers: { "X-Client-Id": userId },
        body: {
            userId,
            linkedinUrl,
            masterProfileId: body?.masterProfileId || null,
        },
    });

    if (!result.ok) {
        return NextResponse.json(
            { error: result.error || "Could not start the LinkedIn scrape." },
            { status: result.status || 500 }
        );
    }

    return NextResponse.json(result.data);
}
