import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getExtensionUser } from "@/lib/extensionAuth";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";

// CORS preflight
export async function OPTIONS() {
    return handleCorsOptions();
}

/**
 * GET /api/extension/status
 * Returns current user status for the extension popup.
 *
 * Headers: Authorization: Bearer <token>
 * Response: { user, credits_remaining, plan_type, defaultProfile }
 */
export async function GET(req: Request) {
    try {
        // ─── Auth Check ───
        const auth = await getExtensionUser(req);
        if (auth.error) {
            return withCors(NextResponse.json(
                { error: auth.error },
                { status: auth.status }
            ));
        }

        const { user, subscription } = auth;

        // ─── Fetch Default Profile (fallback to any profile) ───
        let defaultProfile = await db.master_profiles.findFirst({
            where: {
                user_id: user!.id,
                is_default: true,
            },
            select: {
                id: true,
                name: true,
                parsed_data: true,
            },
        });

        // Fallback: if no default profile, use the first available profile
        if (!defaultProfile) {
            defaultProfile = await db.master_profiles.findFirst({
                where: { user_id: user!.id },
                orderBy: { created_at: "desc" },
                select: {
                    id: true,
                    name: true,
                    parsed_data: true,
                },
            });
        }

        // Fetch all profiles for the switcher
        const allProfilesData = await db.master_profiles.findMany({
            where: { user_id: user!.id },
            orderBy: { created_at: "desc" },
            select: {
                id: true,
                name: true,
                is_default: true
            }
        });

        const allProfiles = allProfilesData.map(p => ({
            id: p.id,
            name: p.name,
            is_default: p.is_default,
        }));

        // Plan-specific credit totals
        const planDefaults: Record<string, number> = { PREMIUM: 150, PRO: 40, FREE: 3 };
        const planDefault = planDefaults[subscription!.plan_type] || 3;
        // Use the larger of stored credits_total and plan default (handles stale DB values)
        const creditsTotal = Math.max(subscription!.credits_total || 0, planDefault);

        return withCors(NextResponse.json({
            user: {
                name: user!.full_name,
                email: user!.email,
            },
            plan_type: subscription!.plan_type,
            credits_remaining: subscription!.credits_remaining,
            credits_total: creditsTotal,
            defaultProfile: defaultProfile
                ? {
                    id: defaultProfile.id,
                    name: defaultProfile.name,
                    hasData: !!(defaultProfile.parsed_data && Object.keys(defaultProfile.parsed_data as object).length > 0),
                }
                : null,
            allProfiles: allProfiles,
        }));
    } catch (error) {
        console.error("[EXTENSION_STATUS]", error);
        return withCors(NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        ));
    }
}
