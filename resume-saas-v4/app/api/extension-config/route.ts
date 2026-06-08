import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type ExtensionRow = {
    extension_id: string;
    extension_version: string;
    extension_name: string;
    install_url: string;
    updated_at: string;
};

const DEFAULTS = {
    extensionId: "",
    extensionVersion: "1.0.0",
    extensionName: "Vignova Extension",
    installUrl: "/dashboard/extension",
};

/**
 * GET /api/extension-config
 * Public — no auth required. Returns the extension ID, current version,
 * and install URL so the dashboard can verify the installed extension matches.
 */
export async function GET() {
    try {
        const rows = (await db.$queryRawUnsafe(
            `SELECT extension_id, extension_version, extension_name, install_url, updated_at
               FROM admin_extension_settings
              WHERE id = 'singleton'
              LIMIT 1`
        )) as ExtensionRow[];

        if (!rows[0]) return NextResponse.json(DEFAULTS);

        const r = rows[0];
        return NextResponse.json({
            extensionId:      r.extension_id,
            extensionVersion: r.extension_version,
            extensionName:    r.extension_name,
            installUrl:       r.install_url || DEFAULTS.installUrl,
        });
    } catch {
        // Table doesn't exist yet (migration not run) — return safe defaults
        return NextResponse.json(DEFAULTS);
    }
}
