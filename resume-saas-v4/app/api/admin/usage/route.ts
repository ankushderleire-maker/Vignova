import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { BUCKETS, BUCKET_LABELS, currentPeriodStart, nextPeriodStart } from "@/lib/planLimits";

/**
 * GET /api/admin/usage
 *
 * What every plan is actually consuming this period.
 *
 * This exists to answer the questions that decide pricing, which nothing in
 * the app could answer before: is the Pro tailoring cap set anywhere near real
 * usage, is anyone ever running out, and which bucket is carrying the cost.
 * Setting an allowance without this is guesswork.
 *
 * Percentiles are computed in memory rather than in SQL. That is fine at this
 * size and keeps the query portable; if the user table grows past a few tens of
 * thousands this should become a grouped aggregate.
 */

function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return sorted[index];
}

export async function GET() {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    try {
        const period = currentPeriodStart();

        const [rows, subscriptions, resumesThisPeriod, interviewsThisPeriod, jobsThisPeriod] =
            await Promise.all([
                db.credit_buckets.findMany({
                    where: { period_start: { gte: period } },
                    select: { user_id: true, bucket: true, remaining: true, total: true },
                }),
                db.subscriptions.findMany({ select: { user_id: true, plan_type: true } }),
                db.generatedResume.count({ where: { createdAt: { gte: period } } }),
                db.savedInterview.count({ where: { createdAt: { gte: period } } }),
                db.jobApplication.count({ where: { createdAt: { gte: period } } }),
            ]);

        const planOf = new Map(subscriptions.map((s) => [s.user_id, s.plan_type || "FREE"]));

        // plan → bucket → the per-user amounts spent this period
        const spend = new Map<string, Map<string, number[]>>();
        // Users who have hit zero in a bucket: the only direct signal that a
        // cap is actually binding on somebody.
        const exhausted = new Map<string, Map<string, number>>();

        for (const row of rows) {
            const plan = planOf.get(row.user_id) || "FREE";
            if (!spend.has(plan)) spend.set(plan, new Map());
            if (!exhausted.has(plan)) exhausted.set(plan, new Map());

            const used = Math.max(0, row.total - row.remaining);
            const byBucket = spend.get(plan)!;
            byBucket.set(row.bucket, [...(byBucket.get(row.bucket) || []), used]);

            if (row.remaining <= 0 && row.total > 0) {
                const zeros = exhausted.get(plan)!;
                zeros.set(row.bucket, (zeros.get(row.bucket) || 0) + 1);
            }
        }

        const plans = [...new Set([...planOf.values(), "FREE", "PRO", "PREMIUM"])].sort();

        const byPlan = plans.map((plan) => {
            const users = subscriptions.filter((s) => (s.plan_type || "FREE") === plan).length;
            const buckets = BUCKETS.map((bucket) => {
                const amounts = (spend.get(plan)?.get(bucket) || []).slice().sort((a, b) => a - b);
                const total = amounts.reduce((sum, n) => sum + n, 0);
                return {
                    bucket,
                    label: BUCKET_LABELS[bucket],
                    // Everything here is "this period", so a number that looks
                    // low early in the month is not necessarily low usage.
                    total_used: total,
                    active_users: amounts.filter((n) => n > 0).length,
                    mean: amounts.length ? Math.round((total / amounts.length) * 10) / 10 : 0,
                    p50: percentile(amounts, 50),
                    p90: percentile(amounts, 90),
                    max: amounts.length ? amounts[amounts.length - 1] : 0,
                    exhausted_users: exhausted.get(plan)?.get(bucket) || 0,
                };
            });
            return { plan_type: plan, users, buckets };
        });

        return NextResponse.json({
            period_start: period.toISOString(),
            resets_at: nextPeriodStart().toISOString(),
            totals: {
                users: subscriptions.length,
                resumes_generated: resumesThisPeriod,
                interviews_generated: interviewsThisPeriod,
                jobs_tracked: jobsThisPeriod,
            },
            by_plan: byPlan,
        });
    } catch (error) {
        console.error("[ADMIN_USAGE]", error);
        return NextResponse.json({ error: "Failed to read usage" }, { status: 500 });
    }
}
