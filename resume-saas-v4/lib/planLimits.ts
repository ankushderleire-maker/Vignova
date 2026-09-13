import { db } from "./db";
import { DEFAULT_PLANS, UNLIMITED, type Bucket, type PlanConfig } from "./planCatalog";

/**
 * The one place plan numbers come from.
 *
 * Before this, the same limits were written out in four places that had drifted
 * apart: prisma/seed-plans.ts said PRO 40, app/api/plans said PRO 40,
 * app/api/billing/upgrade said PRO 50, and app/api/extension/status hardcoded
 * its own {PREMIUM:150, PRO:40, FREE:3}. A user could be told three different
 * allowances depending on which screen they were looking at.
 *
 * plan_configs is now the only source, and it is editable from /admin/plans.
 * The table below is a last-resort fallback for a database with no rows yet;
 * it is never used to override a configured plan.
 */

// Bucket names, labels and prices live in lib/planCatalog.ts, which has no
// server imports so client pages can read them too. Re-exported here so the
// server code that already imports them from this module keeps working.
export { BUCKETS, BUCKET_DESCRIPTIONS, BUCKET_LABELS, UNLIMITED, isBucket } from "./planCatalog";
export type { Bucket } from "./planCatalog";

/**
 * Unlimited is stored as -1 and spent against this ceiling.
 *
 * A plan that advertises "unlimited" still needs a number underneath it, or a
 * single runaway account is an unbounded model bill. This is deliberately high
 * enough that no honest user reaches it, and it is never shown in the UI —
 * never advertise a number you would not defend.
 */
export const FAIR_USE_CEILING = 1000;

export type PlanLimits = {
    plan_type: string;
    tailoring: number;
    writing: number;
    interview: number;
    max_profiles: number;
    has_extension_access: boolean;
    has_multi_profile: boolean;
    has_unlimited_resumes: boolean;
    has_linkedin_optimization: boolean;
    has_interview_prep: boolean;
};

type PlanRow = Pick<
    PlanConfig,
    | "tailoring_credits"
    | "writing_credits"
    | "interview_credits"
    | "max_profiles"
    | "has_extension_access"
    | "has_multi_profile"
    | "has_unlimited_resumes"
    | "has_linkedin_optimization"
    | "has_interview_prep"
>;

function toLimits(plan: string, row: PlanRow): PlanLimits {
    return {
        plan_type: plan,
        tailoring: row.tailoring_credits,
        writing: row.writing_credits,
        interview: row.interview_credits,
        max_profiles: row.max_profiles,
        has_extension_access: row.has_extension_access,
        has_multi_profile: row.has_multi_profile,
        has_unlimited_resumes: row.has_unlimited_resumes,
        has_linkedin_optimization: row.has_linkedin_optimization,
        has_interview_prep: row.has_interview_prep,
    };
}

const FALLBACK: Record<string, PlanLimits> = Object.fromEntries(
    DEFAULT_PLANS.map((plan) => [plan.plan_type, toLimits(plan.plan_type, plan)])
);

export function normalizePlan(planType?: string | null): string {
    const plan = String(planType || "FREE").toUpperCase();
    return plan in FALLBACK ? plan : "FREE";
}

async function readPlanLimits(plan: string): Promise<PlanLimits> {
    const row = await db.plan_configs.findUnique({ where: { plan_type: plan } });
    // No row only happens on a database that has not been seeded, where there
    // is no admin-set number to honour yet.
    return row ? toLimits(plan, row) : FALLBACK[plan];
}

/**
 * The configured limits, for display. Falls back to the defaults when
 * plan_configs cannot be read, so a page that only shows numbers still renders.
 */
export async function planLimits(planType?: string | null): Promise<PlanLimits> {
    const plan = normalizePlan(planType);
    try {
        return await readPlanLimits(plan);
    } catch {
        return FALLBACK[plan];
    }
}

/**
 * The configured limits, for anything that meters or enforces. Throws instead
 * of falling back.
 *
 * When plan_configs cannot be read (an outage, or a column missing because a
 * migration did not run), the defaults are not the number an admin set: Pro's
 * default of 50 would replace an admin's 3. So metering fails closed and the
 * request that needed it errors instead of generating.
 */
export async function enforcedPlanLimits(planType?: string | null): Promise<PlanLimits> {
    return readPlanLimits(normalizePlan(planType));
}

/** The allowance for one bucket, with unlimited resolved to its real ceiling. */
export function allowanceFor(limits: PlanLimits, bucket: Bucket): number {
    const configured = limits[bucket];
    return configured === UNLIMITED ? FAIR_USE_CEILING : Math.max(0, configured);
}

/** True when the plan advertises this bucket as unlimited. */
export function isUnlimited(limits: PlanLimits, bucket: Bucket): boolean {
    return limits[bucket] === UNLIMITED;
}

/**
 * The first day of the month a moment falls in, in UTC.
 *
 * Allowances refresh on the 1st rather than on each user's own billing date:
 * one shared boundary is what makes "resets on the 1st" a sentence you can put
 * on the usage screen without qualifying it per account.
 */
export function currentPeriodStart(now: Date = new Date()): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** When the current allowance runs out, for display. */
export function nextPeriodStart(now: Date = new Date()): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}
