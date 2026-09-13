import { NextResponse } from "next/server";
import { withCors } from "@/lib/extensionCors";
import { ensurePeriod } from "@/lib/credits";
import { db } from "@/lib/db";
import {
    BUCKET_LABELS,
    Bucket,
    allowanceFor,
    nextPeriodStart,
    normalizePlan,
} from "@/lib/planLimits";

/**
 * What the extension is allowed to do on each plan.
 *
 * The split is by cost, not by polish: anything that calls a model is metered,
 * everything else is free. So a free account can still see its match
 * breakdown, move a job through the pipeline, read its own tracked jobs and
 * copy text around — none of that costs us anything, and gating it only made
 * the extension feel broken rather than making anyone upgrade.
 *
 * Free:
 *   match score, job status, the job tracker, profiles, copy/paste, and a
 *   small monthly allowance of every metered feature
 * Pro and Premium:
 *   much larger allowances, plus agent autofill and ATS analysis
 *
 * Allowances are per bucket now rather than one shared pool, which is what
 * lets a cover letter cost less than a tailored resume without fractional
 * credits. See lib/planLimits.ts.
 */

const PAID_PLANS = new Set(["PRO", "PREMIUM"]);

export { normalizePlan };

export function isPaidPlan(planType?: string | null): boolean {
    return PAID_PLANS.has(normalizePlan(planType));
}

type PlanLike = { user_id?: string | null; plan_type?: string | null } | null | undefined;

/**
 * Features that need a paid plan outright, whatever the balance.
 *
 * Everything else is available on every plan and limited only by the bucket,
 * so a free user can try the product on the page they are actually applying
 * from rather than reading about it.
 */
const PAID_ONLY = new Set(["Autofill", "ATS Analysis"]);

function upgradeResponse(plan: string, feature: string) {
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

function outOfCreditsResponse(plan: string, feature: string, bucket: Bucket, remaining: number) {
    const label = BUCKET_LABELS[bucket];
    const resets = nextPeriodStart().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
    });
    return withCors(
        NextResponse.json(
            {
                error: `You're out of ${label.toLowerCase()}.`,
                // Naming the bucket matters: with one pool "out of credits" was
                // the whole story, but now a user can have plenty of writing
                // credits and no tailoring ones, and needs to know which.
                message: `You've used every ${label.toLowerCase().replace(/ credits$/, " credit")} on your plan. They refresh on ${resets}, or you can upgrade for more.`,
                outOfCredits: true,
                upgradeRequired: true,
                bucket,
                plan,
                credits_remaining: remaining,
                feature,
            },
            { status: 402 }
        )
    );
}

/**
 * Guards a metered route. Returns a response to send back, or null to continue.
 *
 * `upgradeRequired` is the signal the extension turns into an upgrade prompt;
 * it is deliberately distinct from an ordinary error so the UI can offer the
 * pricing page instead of a retry. 402 rather than 403: this is "payment
 * required", not "you are not allowed to ask".
 *
 * Pass every bucket the route will spend from — the application pack checks
 * tailoring and writing together, so it refuses before generating rather than
 * halfway through.
 */
export async function checkAiAccess(
    subscription: PlanLike,
    feature: string,
    buckets: Bucket | Bucket[] = "tailoring",
    userId?: string
) {
    const plan = normalizePlan(subscription?.plan_type);

    if (PAID_ONLY.has(feature) && !isPaidPlan(plan)) {
        return upgradeResponse(plan, feature);
    }

    const owner = userId ?? subscription?.user_id ?? null;
    if (!owner) {
        // No account to meter against. Treat as unpaid rather than free.
        return upgradeResponse(plan, feature);
    }

    const limits = await ensurePeriod(owner, plan);
    const wanted = Array.isArray(buckets) ? buckets : [buckets];

    for (const bucket of wanted) {
        // A plan configured with a zero allowance for this bucket is not "out
        // of credits", it simply does not include the feature.
        if (allowanceFor(limits, bucket) <= 0) {
            return upgradeResponse(plan, feature);
        }

        const row = await db.credit_buckets.findFirst({
            where: { user_id: owner, bucket },
            select: { remaining: true },
        });
        if ((row?.remaining ?? 0) <= 0) {
            return outOfCreditsResponse(plan, feature, bucket, row?.remaining ?? 0);
        }
    }

    return null;
}
