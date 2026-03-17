import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

const DEFAULT_SUBSCRIPTION = {
    plan_type: "FREE",
    billing_cycle: "MONTHLY",
    credits_remaining: 3,
    credits_total: 3,
    has_extension_access: false,
    has_multi_profile: false,
    has_unlimited_resumes: false,
    expires_at: null,
};

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

        // Get subscription for this user
        const subscription = await db.subscriptions.findFirst({
            where: { user_id: user.id },
        });

        if (!subscription) {
            return NextResponse.json(DEFAULT_SUBSCRIPTION);
        }

        // Plan-specific default totals when credits_total is not set in DB
        const planDefaults: Record<string, number> = { PREMIUM: 150, PRO: 40, FREE: 3 };
        const defaultTotal = planDefaults[subscription.plan_type] || 3;

        // Return full subscription data
        return NextResponse.json({
            plan_type: subscription.plan_type,
            billing_cycle: subscription.billing_cycle || "MONTHLY",
            credits_remaining: subscription.credits_remaining,
            credits_total: subscription.credits_total || defaultTotal,
            has_extension_access: subscription.has_extension_access || false,
            has_multi_profile: subscription.has_multi_profile || false,
            has_unlimited_resumes: subscription.has_unlimited_resumes || false,
            expires_at: subscription.expires_at,
        });
    } catch (error) {
        console.error("[SUBSCRIPTION_GET]", error);
        return NextResponse.json(DEFAULT_SUBSCRIPTION);
    }
}
