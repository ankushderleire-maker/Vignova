import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { cmpVersion } from "@/lib/extensionVersion";

/**
 * GET /api/admin/extension-settings
 *   → { extensionId, extensionVersion, extensionName, installUrl, updatedAt }
 *
 * PUT /api/admin/extension-settings
 *   body: { extensionId?, extensionVersion?, extensionName?, installUrl?,
 *           minVersion?, updateMessage? }
 *
 * minVersion is the force-update threshold: any extension older than it
 * blocks itself and shows the update screen. The store cannot push an
 * install, so this is the only way to retire a bad build quickly.
 *   → returns updated settings
 *
 * Backed by the admin_extension_settings singleton row (add_extension_settings.sql).
 */

type ExtensionRow = {
    id: string;
    extension_id: string;
    extension_version: string;
    extension_name: string;
    install_url: string;
    min_version: string;
    update_message: string;
    updated_at: string;
    updated_by: string | null;
};

async function readSingleton(): Promise<ExtensionRow | null> {
    const rows = (await db.$queryRawUnsafe(
        `SELECT id, extension_id, extension_version, extension_name, install_url,
                min_version, update_message, updated_at, updated_by
           FROM admin_extension_settings
          WHERE id = 'singleton'
          LIMIT 1`
    )) as ExtensionRow[];
    return rows[0] || null;
}

function shape(r: ExtensionRow) {
    return {
        extensionId:      r.extension_id,
        extensionVersion: r.extension_version,
        extensionName:    r.extension_name,
        installUrl:       r.install_url,
        minVersion:       r.min_version,
        updateMessage:    r.update_message,
        updatedAt:        r.updated_at,
    };
}

export async function GET() {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    try {
        let row = await readSingleton();
        if (!row) {
            await db.$executeRawUnsafe(
                `INSERT INTO admin_extension_settings (id)
                 VALUES ('singleton')
                 ON CONFLICT (id) DO NOTHING`
            );
            row = await readSingleton();
        }
        if (!row) {
            return NextResponse.json(
                { error: "admin_extension_settings table missing — run migrations" },
                { status: 500 }
            );
        }
        return NextResponse.json(shape(row));
    } catch (err) {
        console.error("[ADMIN_EXTENSION_SETTINGS_GET]", err);
        return NextResponse.json({ error: "Failed to load extension settings" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    let body: {
        extensionId?: string;
        extensionVersion?: string;
        extensionName?: string;
        installUrl?: string;
        minVersion?: string;
        updateMessage?: string;
    };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const extensionId      = body.extensionId      !== undefined ? String(body.extensionId).trim()      : null;
    const extensionVersion = body.extensionVersion !== undefined ? String(body.extensionVersion).trim() : null;
    const extensionName    = body.extensionName    !== undefined ? String(body.extensionName).trim()    : null;
    const installUrl       = body.installUrl       !== undefined ? String(body.installUrl).trim()       : null;
    const minVersion       = body.minVersion       !== undefined ? String(body.minVersion).trim()       : null;
    const updateMessage    = body.updateMessage    !== undefined ? String(body.updateMessage).trim()    : null;

    // Basic semver-ish format check for version
    if (extensionVersion !== null && !/^\d+\.\d+(\.\d+)?$/.test(extensionVersion)) {
        return NextResponse.json(
            { error: "extensionVersion must be in format X.Y or X.Y.Z (e.g. 1.0 or 2.1.0)" },
            { status: 400 }
        );
    }

    if (minVersion !== null && !/^\d+\.\d+(\.\d+)?$/.test(minVersion)) {
        return NextResponse.json(
            { error: "minVersion must be in format X.Y or X.Y.Z (e.g. 1.0 or 2.1.0)" },
            { status: 400 }
        );
    }

    // Blocking every build, including the one on the store, would lock
    // every user out with no way back in.
    if (minVersion !== null && extensionVersion !== null && cmpVersion(minVersion, extensionVersion) > 0) {
        return NextResponse.json(
            { error: "minVersion cannot be newer than the released extensionVersion — that would block everyone." },
            { status: 400 }
        );
    }

    try {
        await db.$executeRawUnsafe(
            `UPDATE admin_extension_settings
                SET extension_id      = COALESCE($1::text, extension_id),
                    extension_version = COALESCE($2::text, extension_version),
                    extension_name    = COALESCE($3::text, extension_name),
                    install_url       = COALESCE($4::text, install_url),
                    min_version       = COALESCE($5::text, min_version),
                    update_message    = COALESCE($6::text, update_message),
                    updated_at        = NOW(),
                    updated_by        = $7::uuid
              WHERE id = 'singleton'`,
            extensionId      || null,
            extensionVersion || null,
            extensionName    || null,
            installUrl       || null,
            minVersion       || null,
            // An empty string is a real value here: it clears the notice.
            updateMessage,
            auth.user?.id    || null
        );

        const row = await readSingleton();
        if (!row) throw new Error("Row vanished after update");

        await logAdminAction({
            admin: auth.user!,
            action: "EXTENSION_SETTINGS_UPDATE",
            targetType: "settings",
            targetId: "extension",
            details: { extensionId, extensionVersion, extensionName, installUrl, minVersion, updateMessage },
            req,
        });

        return NextResponse.json(shape(row));
    } catch (err) {
        console.error("[ADMIN_EXTENSION_SETTINGS_PUT]", err);
        return NextResponse.json({ error: "Failed to update extension settings" }, { status: 500 });
    }
}
