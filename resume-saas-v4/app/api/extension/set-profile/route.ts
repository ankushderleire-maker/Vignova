import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getExtensionUser } from "@/lib/extensionAuth";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";

// CORS preflight
export async function OPTIONS() {
    return handleCorsOptions();
}

/**
 * POST /api/extension/set-profile
 * Sets a specific profile as the default for the user.
 *
 * Headers: Authorization: Bearer <token>
 * Body: { profileId: string }
 */
export async function POST(req: Request) {
    try {
        // ─── Auth Check ───
        const auth = await getExtensionUser(req);
        if (auth.error) {
            return withCors(NextResponse.json(
                { error: auth.error },
                { status: auth.status }
            ));
        }

        const { user } = auth;
        const body = await req.json();
        const { profileId } = body;

        if (!profileId) {
            return withCors(NextResponse.json(
                { error: "Profile ID is required" },
                { status: 400 }
            ));
        }

        // Verify the profile belongs to the user
        const targetProfile = await db.master_profiles.findFirst({
            where: {
                id: profileId,
                user_id: user!.id,
            }
        });

        if (!targetProfile) {
            return withCors(NextResponse.json(
                { error: "Profile not found or access denied" },
                { status: 404 }
            ));
        }

        // Perform transaction to set all to false, then target to true
        await db.$transaction([
            db.master_profiles.updateMany({
                where: { user_id: user!.id },
                data: { is_default: false },
            }),
            db.master_profiles.update({
                where: { id: profileId },
                data: { is_default: true },
            }),
        ]);

        return withCors(NextResponse.json({ success: true, profileId }));
    } catch (error) {
        console.error("[EXTENSION_SET_PROFILE]", error);
        return withCors(NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        ));
    }
}
