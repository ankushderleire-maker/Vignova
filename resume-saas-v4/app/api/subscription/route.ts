import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { getBalances } from "@/lib/credits";
import { BUCKET_DESCRIPTIONS, BUCKET_LABELS } from "@/lib/planLimits";

const DEFAULT_SUBSCRIPTION = {
    plan_type: "FREE",
    billing_cycle: "MONTHLY",
    credits_remaining: 3,
    credits_total: 3,
    has_extension_access: false,
    has_multi_profile: false,
    has_unlimited_resumes: false,
    expires_at: null,
    buckets: [],
    resets_at: null,
};

/**
 * GET /api/subscription
 *
 * The signed-in account's plan, and a balance for each credit bucket.
 *
 * `buckets` comes from getBalances(), the same function behind /api/usage, so
 * the header, the dashboard card and the billing page cannot disagree with the
 * usage page. `credits_remaining` and `credits_total` used to come from the
 * legacy single pool, which nothing has spent from since the buckets arrived:
 * that is how the header could say 1 credit while the usage page showed a full
 * allowance. They now mirror the tailoring bucket, as /api/extension/status
 * does, for anything that still reads them.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(DEFAULT_SUBSCRIPTION);
        }

        // Find user by email first
        const user = await db.users.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });

        if (!user) {
            return NextResponse.json(DEFAULT_SUBSCRIPTION);
        }

        const subscription = await db.subscriptions.findFirst({
            where: { user_id: user.id },
        });

        // An account without a subscription row is on Free and still has
        // buckets; getBalances creates them.
        let balances: Awaited<ReturnType<typeof getBalances>> | null = null;
        try {
            balances = await getBalances(user.id, subscription?.plan_type);
        } catch (error) {
            // Still answer with the plan. A page that cannot show balances is
            // better than one that shows the wrong plan.
            console.error("[SUBSCRIPTION_GET] balances", error);
        }

        const buckets = (balances?.buckets ?? []).map((bucket) => ({
            ...bucket,
            label: BUCKET_LABELS[bucket.bucket],
            description: BUCKET_DESCRIPTIONS[bucket.bucket],
        }));
        const tailoring = buckets.find((bucket) => bucket.bucket === "tailoring");

        return NextResponse.json({
            plan_type: subscription?.plan_type ?? "FREE",
            billing_cycle: subscription?.billing_cycle || "MONTHLY",
            credits_remaining: tailoring?.remaining ?? 0,
            credits_total: tailoring?.total ?? 0,
            has_extension_access: subscription?.has_extension_access || false,
            has_multi_profile: subscription?.has_multi_profile || false,
            has_unlimited_resumes: subscription?.has_unlimited_resumes || false,
            expires_at: subscription?.expires_at ?? null,
            buckets,
            resets_at: balances?.resets_at ?? null,
        });
    } catch (error) {
        console.error("[SUBSCRIPTION_GET]", error);
        return NextResponse.json(DEFAULT_SUBSCRIPTION);
    }
}
