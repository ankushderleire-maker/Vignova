import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-guard";
import { db } from "@/lib/db";

/**
 * GET /api/admin/scan-controls
 *   → { cooldownHoursDefault, scanEnabled, scanDisabledReason, updatedAt }
 *
 * PUT /api/admin/scan-controls
 *   body: { cooldownHoursDefault?, scanEnabled?, scanDisabledReason? }
 *   → returns updated settings
 *
 * Backed by the `admin_scan_settings` singleton row (see migration 003).
 * If the row is missing for any reason the GET will seed it on the fly.
 */

type Settings = {
    id: string;
    cooldown_hours_default: number;
    scan_enabled: boolean;
    scan_disabled_reason: string | null;
    updated_at: string;
    updated_by: string | null;
};

async function readSingleton(): Promise<Settings | null> {
    const rows = (await db.$queryRawUnsafe(
        `SELECT id, cooldown_hours_default, scan_enabled,
                scan_disabled_reason, updated_at, updated_by
           FROM admin_scan_settings
          WHERE id = 'singleton'
          LIMIT 1`
    )) as Settings[];
    return rows[0] || null;
}

function shape(s: Settings) {
    return {
        cooldownHoursDefault: s.cooldown_hours_default,
        scanEnabled:          s.scan_enabled,
        scanDisabledReason:   s.scan_disabled_reason,
        updatedAt:            s.updated_at,
    };
}

export async function GET() {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    try {
        let row = await readSingleton();
        if (!row) {
            // Idempotent seed — the migration should have done this but if
            // the DB is fresh we still return sensible defaults.
            await db.$executeRawUnsafe(
                `INSERT INTO admin_scan_settings (id)
                 VALUES ('singleton')
                 ON CONFLICT (id) DO NOTHING`
            );
            row = await readSingleton();
        }
        if (!row) {
            return NextResponse.json(
                { error: "admin_scan_settings table missing — run migrations" },
                { status: 500 }
            );
        }
        return NextResponse.json(shape(row));
    } catch (err) {
        console.error("[ADMIN_SCAN_CONTROLS_GET]", err);
        return NextResponse.json(
            { error: "Failed to load scan settings" },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    let body: {
        cooldownHoursDefault?: number;
        scanEnabled?: boolean;
        scanDisabledReason?: string | null;
    };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate cooldown hours — allow 0..168 (1 week max).
    let cooldown: number | null = null;
    if (body.cooldownHoursDefault !== undefined) {
        const n = Number(body.cooldownHoursDefault);
        if (!Number.isFinite(n) || n < 0 || n > 168) {
            return NextResponse.json(
                { error: "cooldownHoursDefault must be an integer between 0 and 168" },
                { status: 400 }
            );
        }
        cooldown = Math.round(n);
    }

    const scanEnabled =
        typeof body.scanEnabled === "boolean" ? body.scanEnabled : null;
    const reason =
        body.scanDisabledReason === undefined
            ? null
            : body.scanDisabledReason === null
                ? null
                : String(body.scanDisabledReason).slice(0, 500);

    // Build a single UPDATE with COALESCE so undefined fields stay as-is.
    try {
        await db.$executeRawUnsafe(
            `UPDATE admin_scan_settings
                SET cooldown_hours_default = COALESCE($1::int, cooldown_hours_default),
                    scan_enabled           = COALESCE($2::bool, scan_enabled),
                    scan_disabled_reason   = CASE WHEN $3::bool THEN $4::text ELSE scan_disabled_reason END,
                    updated_at             = NOW(),
                    updated_by             = $5::uuid
              WHERE id = 'singleton'`,
            cooldown,
            scanEnabled,
            body.scanDisabledReason !== undefined,   // flag: include reason write
            reason,
            auth.user?.id || null
        );
        const row = await readSingleton();
        if (!row) throw new Error("settings vanished after update");

        await logAdminAction({
            admin: auth.user!,
            action: "SCAN_SETTINGS_UPDATE",
            targetType: "settings",
            targetId: "scan-controls",
            details: { cooldown, scanEnabled, reason },
            req,
        });

        return NextResponse.json(shape(row));
    } catch (err) {
        console.error("[ADMIN_SCAN_CONTROLS_PUT]", err);
        return NextResponse.json(
            { error: "Failed to update scan settings" },
            { status: 500 }
        );
    }
}
