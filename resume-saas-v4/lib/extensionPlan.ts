import { NextResponse } from "next/server";
import { withCors } from "@/lib/extensionCors";

/**
 * What the extension is allowed to do on each plan.
 *
 * The split is by cost, not by polish: anything that calls a model is paid,
 * everything else is free. So a free account can still see its match
 * breakdown, move a job through the pipeline, read its own tracked jobs and
 * copy text around — none of that costs us anything, and gating it only made
 * the extension feel broken rather than making anyone upgrade.
 *
 * Free (or no subscription row at all):
 *   match score, job status, the job tracker, profiles, copy/paste
 * Pro and Premium:
 *   the above, plus tailored resumes, cover letters, recruiter messages,
 *   application emails, interview prep and agent autofill.
 */

const PAID_PLANS = new Set(["PRO", "PREMIUM"]);

export function normalizePlan(planType?: string | null): string {
    return String(planType || "FREE").toUpperCase();
}

export function isPaidPlan(planType?: string | null): boolean {
    return PAID_PLANS.has(normalizePlan(planType));
}

type PlanLike = { plan_type?: string | null; credits_remaining?: number | null } | null | undefined;

/**
 * Guards an AI route. Returns a response to send back, or null to continue.
 *
 * `upgradeRequired` is the signal the extension turns into an upgrade prompt;
 * it is deliberately distinct from an ordinary error so the UI can offer the
 * pricing page instead of a retry. 402 rather than 403: this is "payment
 * required", not "you are not allowed to ask".
 */
export function checkAiAccess(subscription: PlanLike, feature: string) {
    const plan = normalizePlan(subscription?.plan_type);

    if (!isPaidPlan(plan)) {
        return withCors(
            NextResponse.json(
                {
                    error: `${feature} is a Pro feature.`,
                    message: `${feature} needs a Pro or Premium plan. Upgrade to use it — the match score, job tracking and status updates stay free.`,
                    upgradeRequired: true,
                    plan,
                    feature,
                },
                { status: 402 }
            )
        );
    }

    if ((subscription?.credits_remaining ?? 0) <= 0) {
        return withCors(
            NextResponse.json(
                {
                    error: "You're out of credits.",
                    message: "You've used every credit on your plan. They reset each billing cycle, or you can upgrade for more.",
                    outOfCredits: true,
                    upgradeRequired: true,
                    plan,
                    credits_remaining: 0,
                    feature,
                },
                { status: 402 }
            )
        );
    }

    return null;
}
