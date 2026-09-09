import { db } from "@/lib/db";

/**
 * Spending and refunding credits.
 *
 * Two problems this exists to solve.
 *
 * The first is a race. Several routes read `credits_remaining`, subtracted one
 * in JavaScript, and wrote the result back. Two requests that read the same
 * value both write the same decrement, so one credit pays for two generations.
 * `spendCredit` is a single conditional UPDATE instead — the database decides
 * whether there was a credit to take, and only one of two concurrent callers
 * can win.
 *
 * The second is that a credit could be spent on nothing. The ATS report,
 * interview prep and LinkedIn optimiser all deducted before doing the work, so
 * a failed generation still charged. Rather than move every deduction to the
 * end — which would let someone run the expensive part with an empty balance —
 * the credit is reserved up front and given back when the work fails.
 */

export type SpendResult =
    | { ok: true; remaining: number }
    | { ok: false; reason: "no_subscription" | "insufficient" };

/**
 * Takes one credit, if there is one to take.
 *
 * The `credits_remaining: { gt: 0 }` guard is part of the UPDATE, so the check
 * and the decrement cannot be separated by another request.
 */
export async function spendCredit(userId: string): Promise<SpendResult> {
    const result = await db.subscriptions.updateMany({
        where: { user_id: userId, credits_remaining: { gt: 0 } },
        data: { credits_remaining: { decrement: 1 } },
    });

    if (result.count === 0) {
        // Nothing was updated: either there is no row, or the balance is zero.
        // Told apart only to give the caller an honest message.
        const exists = await db.subscriptions.findFirst({
            where: { user_id: userId },
            select: { id: true },
        });
        return { ok: false, reason: exists ? "insufficient" : "no_subscription" };
    }

    const sub = await db.subscriptions.findFirst({
        where: { user_id: userId },
        select: { credits_remaining: true },
    });
    return { ok: true, remaining: sub?.credits_remaining ?? 0 };
}

/**
 * Gives a reserved credit back after the work failed.
 *
 * Never throws: a refund runs on the error path, and an exception here would
 * replace a useful "generation failed" message with a generic 500 — leaving
 * the user with neither their credit nor an explanation.
 */
export async function refundCredit(userId: string, reason: string): Promise<void> {
    try {
        await db.subscriptions.updateMany({
            where: { user_id: userId },
            data: { credits_remaining: { increment: 1 } },
        });
        console.info("[CREDITS] refunded 1 to %s after: %s", userId, reason);
    } catch (err) {
        // Worth knowing about — the user has been charged for nothing.
        console.error("[CREDITS] REFUND FAILED for %s after %s:", userId, reason, err);
    }
}

/** Balance without touching it. */
export async function creditBalance(userId: string): Promise<number> {
    const sub = await db.subscriptions.findFirst({
        where: { user_id: userId },
        select: { credits_remaining: true },
    });
    return sub?.credits_remaining ?? 0;
}
