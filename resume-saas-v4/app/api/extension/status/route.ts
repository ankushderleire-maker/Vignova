import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getExtensionUser } from "@/lib/extensionAuth";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";
import { getBalances } from "@/lib/credits";
import { planLimits } from "@/lib/planLimits";

// CORS preflight
export async function OPTIONS() {
    return handleCorsOptions();
}

/**
 * GET /api/extension/status
 * Returns current user status for the extension popup.
 *
 * Headers: Authorization: Bearer <token>
 * Response: { user, plan_type, credits, credits_remaining, defaultProfile }
 *
 * `credits` carries every bucket and the reset date — that is what the popup's
 * usage panel renders. `credits_remaining` is the tailoring bucket, kept so an
 * extension built before buckets keeps working after this deploys.
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

        // Allowances come from plan_configs via planLimits, not from a table
        // hardcoded here. This route used to carry its own {PREMIUM:150, PRO:40,
        // FREE:3} while seed-plans.ts, api/plans and billing/upgrade each had a
        // different set, so the number a user saw depended on the screen.
        const balances = await getBalances(user!.id, subscription!.plan_type);
        const limits = await planLimits(subscription!.plan_type);
        const tailoring = balances.buckets.find(b => b.bucket === "tailoring");

        return withCors(NextResponse.json({
            user: {
                name: user!.full_name,
                email: user!.email,
            },
            plan_type: subscription!.plan_type,
            credits: balances,
            limits: {
                max_profiles: limits.max_profiles,
                has_extension_access: limits.has_extension_access,
                has_multi_profile: limits.has_multi_profile,
                has_linkedin_optimization: limits.has_linkedin_optimization,
                has_interview_prep: limits.has_interview_prep,
            },
            // Legacy fields — the tailoring bucket, for extensions built before
            // this deploy.
            credits_remaining: tailoring?.remaining ?? 0,
            credits_total: tailoring?.total ?? 0,
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
