import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

/**
 * GET /api/admin/scan-controls/users?search=&limit=50
 *
 * Returns users paired with their cooldown override (if any). The admin UI
 * uses this to show both "which users have custom limits" and "search all
 * users to apply a new override". We LEFT JOIN so users without an override
 * still appear in the result.
 */

type Row = {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    cooldown_hours: number | null;
    scan_disabled: boolean | null;
    scan_disabled_reason: string | null;
    expires_at: string | null;
    updated_at: string | null;
    last_scan_at: string | null;
};

export async function GET(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const url    = new URL(req.url);
    const search = (url.searchParams.get("search") || "").trim().toLowerCase();
    const limit  = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 50)));
    const onlyOverrides = url.searchParams.get("onlyOverrides") === "1";

    try {
        const likeTerm = search ? `%${search}%` : null;

        const rows = (await db.$queryRawUnsafe(
            `SELECT u.id,
                    u.email,
                    u.full_name,
                    u.role,
                    o.cooldown_hours,
                    o.scan_disabled,
                    o.scan_disabled_reason,
                    o.expires_at,
                    o.updated_at,
                    (SELECT MAX(created_at) FROM scan_jobs sj WHERE sj.user_id = u.id) AS last_scan_at
               FROM users u
          LEFT JOIN user_cooldown_overrides o ON o.user_id = u.id
              WHERE ($1::text IS NULL
                     OR LOWER(u.email) LIKE $1
                     OR LOWER(COALESCE(u.full_name, '')) LIKE $1)
                AND ($2::bool = FALSE OR o.user_id IS NOT NULL)
              ORDER BY (o.user_id IS NOT NULL) DESC, u.created_at DESC
              LIMIT $3`,
            likeTerm,
            onlyOverrides,
            limit
        )) as Row[];

        return NextResponse.json({
            users: rows.map((r) => ({
                id:                 r.id,
                email:              r.email,
                fullName:           r.full_name,
                role:               r.role,
                cooldownHours:      r.cooldown_hours,
                scanDisabled:       !!r.scan_disabled,
                scanDisabledReason: r.scan_disabled_reason,
                expiresAt:          r.expires_at,
                overrideUpdatedAt:  r.updated_at,
                lastScanAt:         r.last_scan_at,
            })),
        });
    } catch (err) {
        console.error("[ADMIN_SCAN_CONTROLS_USERS_GET]", err);
        return NextResponse.json(
            { error: "Failed to load users" },
            { status: 500 }
        );
    }
}
