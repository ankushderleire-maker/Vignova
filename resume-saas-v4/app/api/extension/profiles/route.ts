import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getExtensionUser } from "@/lib/extensionAuth";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";
import { jsonObject } from "@/lib/extensionDashboard";

/** The name of the person a Master Profile describes, as the dashboard stores it. */
function personName(parsed: unknown): string {
    const data = jsonObject(parsed);
    const personal = jsonObject(data.personalDetails ?? data.personal_details);
    const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
    const full = [data.fullName, data.full_name, data.name, personal.fullName, personal.full_name].map(text).find(Boolean);
    const parts = [data.firstName ?? data.first_name ?? personal.firstName, data.lastName ?? data.last_name ?? personal.lastName].map(text);
    return (full || parts.filter(Boolean).join(" ")).slice(0, 120);
}

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
                parsed_data: true,
            },
            orderBy: [
                { is_default: 'desc' }, // Default profile first
                { created_at: 'asc' },  // Then by creation date
            ],
        });

        // Each profile's person, so the extension can show a name instead of
        // "Primary Profile". The profile data itself does not leave the server.
        const named = profiles.map(({ parsed_data, ...profile }) => ({ ...profile, person_name: personName(parsed_data) }));
        return withCors(NextResponse.json({ success: true, profiles: named }));
    } catch (error) {
        console.error("[EXTENSION_PROFILES_GET]", error);
        return withCors(NextResponse.json(
            { error: "Internal Error" },
            { status: 500 }
        ));
    }
}
