import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-guard";
import { db } from "@/lib/db";

/**
 * PUT /api/admin/scan-controls/users/[id]
 *   body: {
 *     cooldownHours?: number | null,   // null to clear
 *     scanDisabled?: boolean,
 *     scanDisabledReason?: string | null,
 *     expiresAt?: string | null,        // ISO or null
 *   }
 *
 * DELETE /api/admin/scan-controls/users/[id]
 *   → removes the override row entirely (user reverts to global default).
 */

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id: userId } = await params;

    let body: {
        cooldownHours?: number | null;
        scanDisabled?: boolean;
        scanDisabledReason?: string | null;
        expiresAt?: string | null;
    };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate
    let cooldown: number | null = null;
    let cooldownProvided = false;
    if (body.cooldownHours !== undefined) {
        cooldownProvided = true;
        if (body.cooldownHours === null) {
            cooldown = null;
        } else {
            const n = Number(body.cooldownHours);
            if (!Number.isFinite(n) || n < 0 || n > 168) {
                return NextResponse.json(
                    { error: "cooldownHours must be 0..168 or null" },
                    { status: 400 }
                );
            }
            cooldown = Math.round(n);
        }
    }

    const scanDisabled =
        typeof body.scanDisabled === "boolean" ? body.scanDisabled : null;
    const reason =
        body.scanDisabledReason === undefined
            ? null
            : body.scanDisabledReason === null
                ? null
                : String(body.scanDisabledReason).slice(0, 500);

    let expiresAt: string | null = null;
    let expiresProvided = false;
    if (body.expiresAt !== undefined) {
        expiresProvided = true;
        if (body.expiresAt === null) {
            expiresAt = null;
        } else {
            const d = new Date(body.expiresAt);
            if (isNaN(d.getTime())) {
                return NextResponse.json(
                    { error: "expiresAt must be ISO datetime or null" },
                    { status: 400 }
                );
            }
            expiresAt = d.toISOString();
        }
    }

    // Refuse to act on a non-existent user.
    try {
        const user = await db.users.findUnique({
            where: { id: userId },
            select: { id: true },
        });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
    } catch {
        return NextResponse.json({ error: "User lookup failed" }, { status: 500 });
    }

    // UPSERT — insert a fresh row if none exists, else COALESCE over the
    // currently-stored values so absent fields stay put.
    try {
        await db.$executeRawUnsafe(
            `INSERT INTO user_cooldown_overrides
                 (user_id, cooldown_hours, scan_disabled, scan_disabled_reason,
                  expires_at, updated_by, updated_at)
             VALUES ($1::uuid, $2::int, COALESCE($3::bool, FALSE),
                     CASE WHEN $4::bool THEN $5::text ELSE NULL END,
                     CASE WHEN $6::bool THEN $7::timestamptz ELSE NULL END,
                     $8::uuid, NOW())
             ON CONFLICT (user_id) DO UPDATE SET
                cooldown_hours       = CASE WHEN $9::bool THEN EXCLUDED.cooldown_hours
                                            ELSE user_cooldown_overrides.cooldown_hours END,
                scan_disabled        = COALESCE($3::bool, user_cooldown_overrides.scan_disabled),
                scan_disabled_reason = CASE WHEN $4::bool THEN $5::text
                                            ELSE user_cooldown_overrides.scan_disabled_reason END,
                expires_at           = CASE WHEN $6::bool THEN $7::timestamptz
                                            ELSE user_cooldown_overrides.expires_at END,
                updated_at           = NOW(),
                updated_by           = $8::uuid`,
            userId,
            cooldown,
            scanDisabled,
            body.scanDisabledReason !== undefined,   // flag: include reason write
            reason,
            expiresProvided,                          // flag: include expires write
            expiresAt,
            auth.user?.id || null,
            cooldownProvided                          // flag: include cooldown write on UPDATE
        );

        // Return the fresh row
        const rows = (await db.$queryRawUnsafe(
            `SELECT cooldown_hours, scan_disabled, scan_disabled_reason,
                    expires_at, updated_at
               FROM user_cooldown_overrides
              WHERE user_id = $1::uuid`,
            userId
        )) as Array<{
            cooldown_hours: number | null;
            scan_disabled: boolean;
            scan_disabled_reason: string | null;
            expires_at: string | null;
            updated_at: string;
        }>;
        await logAdminAction({
            admin: auth.user!,
            action: "SCAN_OVERRIDE_UPDATE",
            targetType: "user",
            targetId: userId,
            details: { cooldown, scanDisabled, reason, expiresAt },
            req,
        });

        const r = rows[0];
        return NextResponse.json(
            r
                ? {
                      userId,
                      cooldownHours:      r.cooldown_hours,
                      scanDisabled:       r.scan_disabled,
                      scanDisabledReason: r.scan_disabled_reason,
                      expiresAt:          r.expires_at,
                      updatedAt:          r.updated_at,
                  }
                : { userId }
        );
    } catch (err) {
        console.error("[ADMIN_SCAN_CONTROLS_USER_PUT]", err);
        return NextResponse.json(
            { error: "Failed to save override" },
            { status: 500 }
        );
    }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id: userId } = await params;
    try {
        await db.$executeRawUnsafe(
            `DELETE FROM user_cooldown_overrides WHERE user_id = $1::uuid`,
            userId
        );

        await logAdminAction({
            admin: auth.user!,
            action: "SCAN_OVERRIDE_CLEAR",
            targetType: "user",
            targetId: userId,
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[ADMIN_SCAN_CONTROLS_USER_DELETE]", err);
        return NextResponse.json(
            { error: "Failed to clear override" },
            { status: 500 }
        );
    }
}
