import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { getBalances } from "@/lib/credits";
import { BUCKET_DESCRIPTIONS, BUCKET_LABELS, planLimits } from "@/lib/planLimits";

/**
 * GET /api/usage
 *
 * Every allowance the signed-in account has, what it has spent, and when the
 * next refresh lands. One endpoint serves the dashboard usage page and the
 * extension's usage panel, so the two can never disagree about a balance.
 *
 * getBalances() calls ensurePeriod(), so simply opening this page repairs an
 * account whose buckets are still on last month — which is also why there is
 * no scheduled job to keep running.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id as string | undefined;
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const subscription = await db.subscriptions.findFirst({
            where: { user_id: userId },
            select: { plan_type: true, expires_at: true, billing_cycle: true },
        });

        const balances = await getBalances(userId, subscription?.plan_type);
        const limits = await planLimits(subscription?.plan_type);

        const profileCount = await db.master_profiles.count({ where: { user_id: userId } });

        return NextResponse.json({
            plan_type: balances.plan_type,
            billing_cycle: subscription?.billing_cycle ?? "MONTHLY",
            expires_at: subscription?.expires_at ?? null,
            resets_at: balances.resets_at,
            buckets: balances.buckets.map((bucket) => ({
                ...bucket,
                label: BUCKET_LABELS[bucket.bucket],
                description: BUCKET_DESCRIPTIONS[bucket.bucket],
            })),
            profiles: {
                used: profileCount,
                total: limits.max_profiles,
                unlimited: limits.max_profiles === -1,
            },
            features: {
                extension: limits.has_extension_access,
                multi_profile: limits.has_multi_profile,
                linkedin_optimization: limits.has_linkedin_optimization,
                interview_prep: limits.has_interview_prep,
                unlimited_resumes: limits.has_unlimited_resumes,
            },
        });
    } catch (error) {
        console.error("[USAGE]", error);
        return NextResponse.json({ error: "Could not read your usage." }, { status: 500 });
    }
}
