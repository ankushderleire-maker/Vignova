import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-guard";
import { callBackend } from "@/lib/career-ops";

/**
 * Admin-only: manually run the ATS ingestion pipeline.
 *
 *   GET  /api/admin/ats-ingest  → returns the public cron URL + auth header
 *                                 the admin should paste into their scheduler.
 *   POST /api/admin/ats-ingest  → proxies to the Python backend and runs
 *                                 the ingestion synchronously. Response
 *                                 mirrors the backend payload.
 *
 * The ingestion itself can take several minutes on large source lists — we
 * bump the timeout to 5 minutes.
 */

const PUBLIC_BACKEND_URL =
    process.env.PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "https://api.vignova.io";

export async function GET() {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    // We deliberately avoid leaking the INTERNAL_API_KEY to the browser —
    // the admin copies the URL + sets the header on their cron server
    // using the shared secret they already have in deployment.
    return NextResponse.json({
        method: "POST",
        url: `${PUBLIC_BACKEND_URL.replace(/\/$/, "")}/api/ats/ingest`,
        authHeader: "X-API-Key",
        authHeaderValue: "<INTERNAL_API_KEY from your backend .env>",
        curlExample:
            `curl -X POST '${PUBLIC_BACKEND_URL.replace(/\/$/, "")}/api/ats/ingest' ` +
            `-H 'X-API-Key: <INTERNAL_API_KEY>'`,
        cronExample:
            `0 */6 * * * curl -fsS -X POST '${PUBLIC_BACKEND_URL.replace(/\/$/, "")}/api/ats/ingest' ` +
            `-H 'X-API-Key: <INTERNAL_API_KEY>' >> /var/log/ats-ingest.log 2>&1`,
        notes:
            "Runs every 6 hours in the example above. Adjust the cron expression to taste. " +
            "The endpoint returns 409 if a run is already in progress, so overlapping " +
            "triggers are safe.",
    });
}

export async function POST() {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    await logAdminAction({
        admin: auth.user,
        action: "ATS_INGEST_RUN",
        targetType: "system",
        targetId: "ats-ingest",
    });

    const result = await callBackend<any>("/api/ats/ingest", {
        method: "POST",
        timeoutMs: 5 * 60_000, // 5 min — ingestion can be slow on cold caches
    });

    if (!result.ok) {
        return NextResponse.json(
            {
                error: result.error || "ATS ingestion failed",
                status: result.status,
            },
            { status: result.status || 500 }
        );
    }

    return NextResponse.json(result.data || { status: "success" });
}
