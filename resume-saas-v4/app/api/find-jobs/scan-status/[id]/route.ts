import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { callBackend } from "@/lib/career-ops";

/**
 * Polling endpoint for the "Scan Portals Now" agent UI.
 *
 * Thin proxy to the Python backend's /api/scan/status/{scan_id}. Returns the
 * live row from scan_jobs so the frontend can show progress (jobs_fetched /
 * jobs_inserted / duplicates / status) while the scan is still running.
 *
 * Security: NextAuth session required. Additionally verifies that the
 * scan_jobs row belongs to the authenticated user — we don't want a user
 * polling someone else's scan by guessing IDs.
 */
export async function GET(
    _req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: scanId } = await context.params;
    if (!scanId) {
        return NextResponse.json({ error: "Missing scan id" }, { status: 400 });
    }

    const result = await callBackend<any>(
        `/api/scan/status/${encodeURIComponent(scanId)}`,
        { method: "GET", timeoutMs: 10_000 }
    );

    if (!result.ok) {
        return NextResponse.json(
            { error: result.error || "Status lookup failed" },
            { status: result.status || 500 }
        );
    }

    const row = result.data;

    // Tenant guard — only the owner can poll this scan. If user_id is empty
    // on the row (backend call without user attribution) just pass it through.
    if (row?.user_id && row.user_id !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(row);
}
