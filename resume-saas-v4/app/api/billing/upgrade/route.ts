import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

// Fallback plan configs if DB has none
const FALLBACK_PLANS: Record<string, { credits: number; hasExtension: boolean; hasMultiProfile: boolean; hasUnlimited: boolean }> = {
    FREE: { credits: 3, hasExtension: false, hasMultiProfile: false, hasUnlimited: false },
    PRO: { credits: 50, hasExtension: true, hasMultiProfile: true, hasUnlimited: false },
    PREMIUM: { credits: 100, hasExtension: true, hasMultiProfile: true, hasUnlimited: true },
};

const BILLING_MONTHS: Record<string, number> = {
    MONTHLY: 1,
    SEMI_ANNUAL: 6,
    ANNUAL: 12,
};

async function getPlanConfig(planType: string) {
    try {
        const dbPlan = await db.plan_configs.findUnique({ where: { plan_type: planType } });
        if (dbPlan) {
            return {
                credits: dbPlan.credits,
                hasExtension: dbPlan.has_extension_access,
                hasMultiProfile: dbPlan.has_multi_profile,
                hasUnlimited: dbPlan.has_unlimited_resumes,
            };
        }
    } catch { /* fall through to fallback */ }
    return FALLBACK_PLANS[planType] || null;
}

export async function POST(req: Request) {
    try {
        // ADMIN-ONLY: This route can upgrade plans without payment,
        // so it must be restricted to admin users only.
        const auth = await requireAdmin();
        if (auth.error) return auth.error;

        const adminUser = auth.user!;

        // Parse body — admin specifies which user to upgrade
        const body = await req.json();
        const { plan_type, billing_cycle, user_id } = body;

        // Admin must specify which user to upgrade
        const targetUserId = user_id || adminUser.id;

        // Validate plan
        const plan = await getPlanConfig(plan_type);
        if (!plan) {
            return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
        }

        // Cannot "upgrade" to free
        if (plan_type === "FREE") {
            return NextResponse.json({ error: "Cannot upgrade to free plan" }, { status: 400 });
        }

        const months = BILLING_MONTHS[billing_cycle] || 1;

        // Calculate expiry date
        const startsAt = new Date();
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + months);

        // Find existing subscription
        const existingSub = await db.subscriptions.findFirst({
            where: { user_id: targetUserId },
        });

        const subscriptionData = {
            plan_type,
            billing_cycle: billing_cycle || "MONTHLY",
            credits_remaining: plan.credits,
            credits_total: plan.credits,
            has_extension_access: plan.hasExtension,
            has_multi_profile: plan.hasMultiProfile,
            has_unlimited_resumes: plan.hasUnlimited,
            starts_at: startsAt,
            expires_at: expiresAt,
        };

        let subscription;
        if (existingSub) {
            subscription = await db.subscriptions.update({
                where: { id: existingSub.id },
                data: subscriptionData,
            });
        } else {
            subscription = await db.subscriptions.create({
                data: {
                    user_id: targetUserId,
                    ...subscriptionData,
                },
            });
        }

        return NextResponse.json({
            success: true,
            subscription: {
                plan_type: subscription.plan_type,
                billing_cycle: subscription.billing_cycle,
                credits_remaining: subscription.credits_remaining,
                credits_total: subscription.credits_total,
                expires_at: subscription.expires_at,
            },
        });
    } catch (error) {
        console.error("[BILLING_UPGRADE]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
