import { db } from "@/lib/db";
import {
    BUCKETS,
    Bucket,
    PlanLimits,
    allowanceFor,
    currentPeriodStart,
    isUnlimited,
    nextPeriodStart,
    planLimits,
} from "@/lib/planLimits";

/**
 * Spending and refunding metered credits.
 *
 * Three problems this exists to solve.
 *
 * The first is a race. Several routes read the balance, subtracted one in
 * JavaScript, and wrote the result back. Two requests that read the same value
 * both write the same decrement, so one credit pays for two generations. Every
 * spend here is a single conditional UPDATE instead — the database decides
 * whether there was a credit to take, and only one of two concurrent callers
 * can win.
 *
 * The second is that a credit could be spent on nothing. Rather than move
 * deductions to the end — which would let someone run the expensive part with
 * an empty balance — the credit is reserved up front and given back when the
 * work fails.
 *
 * The third is that allowances never actually refreshed. Nothing refilled
 * credits_remaining after the upgrade that granted it, while the out-of-credits
 * message told users "they reset each billing cycle". Refills are now lazy:
 * every read repairs the row if it belongs to an older period, so there is no
 * cron to forget to run.
 */

export type SpendResult =
    | { ok: true; remaining: number }
    | { ok: false; reason: "insufficient" | "no_subscription"; remaining: number };

export type BucketState = {
    bucket: Bucket;
    remaining: number;
    total: number;
    used: number;
    unlimited: boolean;
};

/**
 * Brings a user's buckets into the current period, creating them if missing.
 *
 * Safe to call on every read. Rows already in the current period are left
 * alone, so this costs one indexed query in the common case.
 */
export async function ensurePeriod(userId: string, plan?: string | null): Promise<PlanLimits> {
    const planType =
        plan ??
        (
            await db.subscriptions.findFirst({
                where: { user_id: userId },
                select: { plan_type: true },
            })
        )?.plan_type;

    const limits = await planLimits(planType);
    const period = currentPeriodStart();
    const rows = await db.credit_buckets.findMany({ where: { user_id: userId } });
    const byName = new Map(rows.map((row) => [row.bucket, row]));

    for (const bucket of BUCKETS) {
        const allowance = allowanceFor(limits, bucket);
        const row = byName.get(bucket);

        if (!row) {
            await db.credit_buckets.create({
                data: {
                    user_id: userId,
                    bucket,
                    remaining: allowance,
                    total: allowance,
                    period_start: period,
                },
            });
            continue;
        }

        // A row from an earlier month refills. The guard on period_start makes
        // two concurrent requests idempotent: the second updates nothing.
        if (row.period_start < period) {
            await db.credit_buckets.updateMany({
                where: { user_id: userId, bucket, period_start: { lt: period } },
                data: { remaining: allowance, total: allowance, period_start: period },
            });
            continue;
        }

        // Same period, but the plan's allowance changed under them — an admin
        // edit, or an upgrade. Raise the ceiling without wiping what they spent.
        if (row.total !== allowance) {
            const spent = Math.max(0, row.total - row.remaining);
            await db.credit_buckets.updateMany({
                where: { user_id: userId, bucket, period_start: period },
                data: { total: allowance, remaining: Math.max(0, allowance - spent) },
            });
        }
    }

    return limits;
}

/**
 * Takes `amount` from one bucket, if it is there to take.
 *
 * The `remaining: { gte: amount }` guard is part of the UPDATE, so the check
 * and the decrement cannot be separated by another request.
 */
export async function spendCredits(
    userId: string,
    bucket: Bucket,
    amount = 1
): Promise<SpendResult> {
    await ensurePeriod(userId);

    const result = await db.credit_buckets.updateMany({
        where: { user_id: userId, bucket, remaining: { gte: amount } },
        data: { remaining: { decrement: amount } },
    });

    const row = await db.credit_buckets.findFirst({
        where: { user_id: userId, bucket },
        select: { remaining: true },
    });

    if (result.count === 0) {
        return {
            ok: false,
            reason: row ? "insufficient" : "no_subscription",
            remaining: row?.remaining ?? 0,
        };
    }
    return { ok: true, remaining: row?.remaining ?? 0 };
}

/**
 * Takes from several buckets at once, all or nothing.
 *
 * The application pack spends a tailoring credit and a writing credit. Done as
 * two sequential updates it can take the first and fail the second, charging
 * for something never delivered, so both guards run inside one transaction and
 * the whole thing rolls back if either comes up short.
 */
export async function spendMany(
    userId: string,
    costs: Partial<Record<Bucket, number>>
): Promise<{ ok: true } | { ok: false; bucket: Bucket; remaining: number }> {
    await ensurePeriod(userId);

    const wanted = Object.entries(costs).filter(([, amount]) => (amount ?? 0) > 0) as [
        Bucket,
        number
    ][];
    if (wanted.length === 0) return { ok: true };

    try {
        await db.$transaction(async (tx) => {
            for (const [bucket, amount] of wanted) {
                const result = await tx.credit_buckets.updateMany({
                    where: { user_id: userId, bucket, remaining: { gte: amount } },
                    data: { remaining: { decrement: amount } },
                });
                if (result.count === 0) {
                    const short = new Error("INSUFFICIENT") as Error & { bucket?: Bucket };
                    short.bucket = bucket;
                    throw short;
                }
            }
        });
        return { ok: true };
    } catch (err) {
        const bucket = (err as { bucket?: Bucket }).bucket ?? wanted[0][0];
        const row = await db.credit_buckets.findFirst({
            where: { user_id: userId, bucket },
            select: { remaining: true },
        });
        return { ok: false, bucket, remaining: row?.remaining ?? 0 };
    }
}

/**
 * Gives reserved credits back after the work failed.
 *
 * Never throws: a refund runs on the error path, and an exception here would
 * replace a useful "generation failed" message with a generic 500 — leaving the
 * user with neither their credit nor an explanation. Capped at `total` so a
 * double refund cannot mint credits.
 */
export async function refundCredits(
    userId: string,
    bucket: Bucket,
    reason: string,
    amount = 1
): Promise<void> {
    try {
        const row = await db.credit_buckets.findFirst({
            where: { user_id: userId, bucket },
            select: { remaining: true, total: true },
        });
        if (!row) return;
        const restored = Math.min(row.total, row.remaining + amount);
        await db.credit_buckets.updateMany({
            where: { user_id: userId, bucket },
            data: { remaining: restored },
        });
        console.info("[CREDITS] refunded %d %s to %s after: %s", amount, bucket, userId, reason);
    } catch (err) {
        // Worth knowing about — the user has been charged for nothing.
        console.error("[CREDITS] REFUND FAILED (%s) for %s after %s:", bucket, userId, reason, err);
    }
}

/** Refunds several buckets at once, for a failed pack. */
export async function refundMany(
    userId: string,
    costs: Partial<Record<Bucket, number>>,
    reason: string
): Promise<void> {
    for (const [bucket, amount] of Object.entries(costs) as [Bucket, number][]) {
        if (amount > 0) await refundCredits(userId, bucket, reason, amount);
    }
}

/** Every bucket's state, for the usage screen and the extension. */
export async function getBalances(
    userId: string,
    plan?: string | null
): Promise<{ buckets: BucketState[]; resets_at: string; plan_type: string }> {
    const limits = await ensurePeriod(userId, plan);
    const rows = await db.credit_buckets.findMany({ where: { user_id: userId } });
    const byName = new Map(rows.map((row) => [row.bucket, row]));

    const buckets: BucketState[] = BUCKETS.map((bucket) => {
        const row = byName.get(bucket);
        const total = row?.total ?? allowanceFor(limits, bucket);
        const remaining = row?.remaining ?? total;
        return {
            bucket,
            remaining,
            total,
            used: Math.max(0, total - remaining),
            unlimited: isUnlimited(limits, bucket),
        };
    });

    return {
        buckets,
        resets_at: nextPeriodStart().toISOString(),
        plan_type: limits.plan_type,
    };
}

/** Balance of one bucket without spending it. */
export async function creditBalance(userId: string, bucket: Bucket = "tailoring"): Promise<number> {
    await ensurePeriod(userId);
    const row = await db.credit_buckets.findFirst({
        where: { user_id: userId, bucket },
        select: { remaining: true },
    });
    return row?.remaining ?? 0;
}

/**
 * @deprecated Legacy single-pool spend, kept so any route not yet migrated
 * keeps working during the rollout. Spends from the tailoring bucket. Delete
 * once nothing imports it.
 */
export async function spendCredit(userId: string): Promise<SpendResult> {
    return spendCredits(userId, "tailoring", 1);
}

/** @deprecated Legacy refund. Use refundCredits(userId, bucket, reason). */
export async function refundCredit(userId: string, reason: string): Promise<void> {
    return refundCredits(userId, "tailoring", reason, 1);
}
