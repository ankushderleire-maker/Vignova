import { db } from "./db";

export interface Subscription {
    id: string;
    user_id: string;
    plan_type: string;
    credits_remaining: number;
}

/**
 * Get user's subscription details
 */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
    try {
        const subscription = await db.subscriptions.findFirst({
            where: { user_id: userId },
        });
        return subscription;
    } catch (error) {
        console.error("[GET_USER_SUBSCRIPTION]", error);
        return null;
    }
}

/**
 * Check if user has Pro or Premium subscription
 */
export function isPro(subscription: Subscription | null): boolean {
    return subscription?.plan_type === "PRO" || subscription?.plan_type === "PREMIUM";
}

/**
 * Check if user can create a new profile
 * Free users: max 1 profile
 * Pro users: unlimited profiles
 */
export function canCreateProfile(subscription: Subscription | null, currentProfileCount: number): boolean {
    if (isPro(subscription)) {
        return true; // Pro users have unlimited profiles
    }
    return currentProfileCount < 1; // Free users can only have 1 profile
}

/**
 * Get the maximum number of profiles allowed for a user
 */
export function getMaxProfiles(subscription: Subscription | null): number {
    return isPro(subscription) ? Infinity : 1;
}
