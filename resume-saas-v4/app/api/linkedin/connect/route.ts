import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { callBackend } from "@/lib/career-ops";

/**
 * POST /api/linkedin/connect
 *
 * Begins importing a public LinkedIn profile. Returns { ref } immediately; the
 * page polls /api/linkedin/connect/status with that ref.
 *
 * The route name, the field names and the response shape are all deliberately
 * ours rather than the upstream provider's. Anyone with devtools open sees the
 * request that starts a LinkedIn connection and nothing about how it is
 * serviced — the previous route was called "scrape" and handed back the
 * provider's own run id and state vocabulary, which named the vendor for
 * anyone who cared to look.
 *
 * Security is unchanged: NextAuth session required, and userId comes from the
 * session rather than the body, so a caller cannot file an import under
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
        // The upstream message can name the provider, so it is logged rather
        // than returned.
        console.error("[LINKEDIN_CONNECT]", result.status, result.error);
        return NextResponse.json(
            { error: "Could not start the LinkedIn import. Please try again." },
            { status: result.status && result.status < 500 ? result.status : 502 }
        );
    }

    const ref = result.data?.runId;
    if (!ref) {
        console.error("[LINKEDIN_CONNECT] upstream returned no reference");
        return NextResponse.json(
            { error: "Could not start the LinkedIn import. Please try again." },
            { status: 502 }
        );
    }

    return NextResponse.json({ ref, linkedinUrl });
}
