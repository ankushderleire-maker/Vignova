import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

/**
 * GET /api/job-scrapper/recent-jobs?scanId=<id>&limit=<n>
 *
 * Returns the LinkedIn/Indeed jobs tied to the caller's most recent scan so
 * the Job Scrapper page can render cards right after a run finishes.
 *
 *   - scanId     optional; when omitted we fall back to the user's newest scan
 *   - limit      1..100, defaults to 30
 *
 * We match jobs by (created_by_user_id = user) AND (scraped_at >= scan.started_at
 * OR created_at >= scan.started_at). This is stable even if the scraper didn't
 * stamp scan_id directly onto the jobs row.
 */

type JobRow = {
    id: string;
    title: string;
    company: string;
    location: string | null;
    description: string | null;
    apply_url: string | null;
    source: string | null;
    source_type: string | null;
    experience_level: string | null;
    date_posted: Date | string | null;
    scraped_at: Date | string | null;
    created_at: Date | string;
};

type ScanRow = {
    id: string;
    status: string;
    started_at: Date | string | null;
    created_at: Date | string;
    completed_at: Date | string | null;
};

function getSessionUserId(session: Session | null) {
    const user = session?.user as (Session["user"] & { id?: string }) | undefined;
    return user?.id;
}

function toIso(value: Date | string | null): string | null {
    if (!value) return null;
    return new Date(value).toISOString();
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const userId = getSessionUserId(session);
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const scanId = url.searchParams.get("scanId")?.trim() || null;
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 30)));

    try {
        // 1) Resolve the scan we're anchoring against — either the requested one
        //    (ownership-checked) or the user's most recent.
        let scan: ScanRow | null = null;

        if (scanId) {
            const rows = (await db.$queryRawUnsafe(
                `SELECT id, status, started_at, created_at, completed_at
                   FROM scan_jobs
                  WHERE id = $1
                    AND user_id = $2::uuid
                  LIMIT 1`,
                scanId,
                userId
            )) as ScanRow[];
            scan = rows[0] || null;
        } else {
            const rows = (await db.$queryRawUnsafe(
                `SELECT id, status, started_at, created_at, completed_at
                   FROM scan_jobs
                  WHERE user_id = $1::uuid
                  ORDER BY created_at DESC
                  LIMIT 1`,
                userId
            )) as ScanRow[];
            scan = rows[0] || null;
        }

        if (!scan) {
            return NextResponse.json({ scan: null, jobs: [] });
        }

        // 2) Pull LinkedIn/Indeed jobs this user triggered since the scan
        //    started. We widen the window by a few seconds either side to
        //    absorb clock skew between the web and Python workers.
        const anchor = scan.started_at || scan.created_at;

        const jobs = (await db.$queryRawUnsafe(
            `SELECT id, title, company, location, description, apply_url,
                    source, source_type, experience_level,
                    date_posted, scraped_at, created_at
               FROM jobs
              WHERE created_by_user_id = $1::uuid
                AND LOWER(COALESCE(source, '')) IN ('linkedin', 'indeed')
                AND COALESCE(scraped_at, created_at) >= ($2::timestamptz - INTERVAL '10 seconds')
              ORDER BY COALESCE(scraped_at, created_at) DESC, created_at DESC
              LIMIT $3`,
            userId,
            anchor,
            limit
        )) as JobRow[];

        return NextResponse.json({
            scan: {
                id:           scan.id,
                status:       scan.status,
                startedAt:    toIso(scan.started_at),
                createdAt:    toIso(scan.created_at) || new Date().toISOString(),
                completedAt:  toIso(scan.completed_at),
            },
            jobs: jobs.map((row) => ({
                id:              row.id,
                title:           row.title,
                company:         row.company,
                location:        row.location,
                description:     row.description,
                apply_url:       row.apply_url,
                source:          row.source,
                source_type:     row.source_type,
                experience_level: row.experience_level,
                date_posted:     toIso(row.date_posted),
                scraped_at:      toIso(row.scraped_at),
            })),
        });
    } catch (err) {
        console.error("[JOB_SCRAPPER_RECENT_JOBS_GET]", err);
        return NextResponse.json(
            { error: "Failed to load recent jobs" },
            { status: 500 }
        );
    }
}
