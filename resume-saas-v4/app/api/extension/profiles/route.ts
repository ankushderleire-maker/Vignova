import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getExtensionUser } from "@/lib/extensionAuth";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";

// CORS preflight
export async function OPTIONS() {
    return handleCorsOptions();
}

/**
 * GET /api/extension/profiles
 * Fetch all profiles for the logged-in user via extension token
 */
export async function GET(req: Request) {
    try {
        const auth = await getExtensionUser(req);
        if (auth.error) {
            return withCors(NextResponse.json(
                { error: auth.error },
                { status: auth.status }
            ));
        }

        const { user } = auth;
        const userId = user!.id;

        const profiles = await db.master_profiles.findMany({
            where: {
                user_id: userId,
            },
            select: {
                id: true,
                name: true,
                is_default: true,
                created_at: true,
                updated_at: true,
            },
            orderBy: [
                { is_default: 'desc' }, // Default profile first
                { created_at: 'asc' },  // Then by creation date
            ],
        });

        return withCors(NextResponse.json({ success: true, profiles }));
    } catch (error) {
        console.error("[EXTENSION_PROFILES_GET]", error);
        return withCors(NextResponse.json(
            { error: "Internal Error" },
            { status: 500 }
        ));
    }
}
