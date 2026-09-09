import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";
import { cmpVersion, isValidVersion } from "@/lib/extensionVersion";

export const OPTIONS = handleCorsOptions;
export const dynamic = "force-dynamic";

/**
 * GET /api/extension/version?v=1.3.0
 *
 * Tells an extension whether it is still allowed to run.
 *
 * The Chrome Web Store updates on its own schedule and offers no way to retire
 * a build, so a version with a broken API contract — or a leaked one — can keep
 * calling us for days. The admin sets `min_version`; anything below it blocks
 * itself and shows the update screen.
 *
 * Deliberately unauthenticated. A blocked build must still be able to ask, and
 * this runs before sign-in; it returns nothing that isn't already public in the
 * store listing.
 */
export async function GET(req: Request) {
    const current = new URL(req.url).searchParams.get("v") || "";

    try {
        const rows = (await db.$queryRawUnsafe(
            `SELECT extension_version, min_version, update_message, install_url
               FROM admin_extension_settings
              WHERE id = 'singleton'
              LIMIT 1`
        )) as Array<{
            extension_version: string;
            min_version: string;
            update_message: string;
            install_url: string;
        }>;

        const row = rows[0];
        const latest = row?.extension_version || "0.0.0";
        const minimum = row?.min_version || "0.0.0";
        const installUrl =
            row?.install_url || "https://chromewebstore.google.com/search/vignova";

        // An unparseable or absent version is not blocked: it is far more
        // likely to be our own bug than an attacker, and locking people out of
        // a working extension is the worse failure.
        const blocked = isValidVersion(current) && cmpVersion(current, minimum) < 0;
        const updateAvailable = isValidVersion(current) && cmpVersion(current, latest) < 0;

        return withCors(
            NextResponse.json(
                {
                    current: current || null,
                    latest,
                    minimum,
                    blocked,
                    updateAvailable,
                    installUrl,
                    message:
                        row?.update_message ||
                        "This version of the Vignova extension is no longer supported. Update to carry on.",
                },
                { headers: { "Cache-Control": "public, max-age=900" } }
            )
        );
    } catch (error) {
        console.error("[EXTENSION_VERSION]", error);
        // Fail open. If we cannot read the setting we must not block anyone —
        // an outage here would otherwise take every install down with it.
        return withCors(
            NextResponse.json({
                current: current || null,
                latest: null,
                minimum: "0.0.0",
                blocked: false,
                updateAvailable: false,
                installUrl: "https://chromewebstore.google.com/search/vignova",
                message: "",
            })
        );
    }
}
