import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { callBackend } from "@/lib/career-ops";
import { redactLinkedInAnalysis } from "@/lib/linkedin-redact";

/**
 * POST /api/linkedin/connect/status
 *
 * Polls an in-flight import. Answers one of:
 *   { status: "pending" }
 *   { status: "ready", profile: <analysis> }
 *   { status: "failed", error }
 *
 * The upstream payload is mapped rather than forwarded. It carries the
 * provider's own state vocabulary and status text, and passing that through
 * put the vendor's name in the browser's network tab for anyone who looked.
 * Only the three states above and our own copy ever reach the client.
 *
 * The analysis is stored against the session user, so a guessed ref can never
 * write into another account.
 */

/** Upstream states that mean "still working". Everything else is terminal. */
const PENDING = new Set(["RUNNING", "READY", "PENDING"]);

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

    const ref = typeof body?.ref === "string" ? body.ref.trim() : "";
    const linkedinUrl = typeof body?.linkedinUrl === "string" ? body.linkedinUrl.trim() : "";
    if (!ref || !linkedinUrl) {
        return NextResponse.json({ error: "Missing reference or profile URL" }, { status: 400 });
    }

    const result = await callBackend<any>("/api/linkedin/scrape/status", {
        method: "POST",
        timeoutMs: 60_000,
        headers: { "X-Client-Id": userId },
        body: {
            userId,
            runId: ref,
            linkedinUrl,
            masterProfileId: body?.masterProfileId || null,
        },
    });

    if (!result.ok) {
        console.error("[LINKEDIN_CONNECT_STATUS]", result.status, result.error);
        return NextResponse.json(
            { error: "We lost track of that import. Please try again." },
            { status: result.status && result.status < 500 ? result.status : 502 }
        );
    }

    const upstream = result.data ?? {};

    if (upstream.status === "SUCCEEDED" && upstream.result) {
        return NextResponse.json({ status: "ready", profile: redactLinkedInAnalysis(upstream.result) });
    }

    if (upstream.status === "RUNNING" || PENDING.has(String(upstream.state || "").toUpperCase())) {
        // Note: no `state` and no upstream status text — both name the vendor.
        return NextResponse.json({ status: "pending" });
    }

    console.error("[LINKEDIN_CONNECT_STATUS] terminal:", upstream.status, upstream.state, upstream.error);
    return NextResponse.json({
        status: "failed",
        error: "We couldn't read that LinkedIn profile. Check the URL is public and try again.",
    });
}
