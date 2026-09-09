import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { spendCredit } from "@/lib/credits";

/**
 * POST /api/credits/deduct
 *
 * Reserves one credit before a paid operation. Pair it with
 * /api/credits/refund on the failure path — a reserved credit that is never
 * settled is a credit the user paid for nothing.
 *
 * This used to read the balance, subtract one in JavaScript and write it back,
 * so two concurrent requests could both read the same number and both write
 * the same decrement: one credit, two generations. spendCredit does it in a
 * single conditional UPDATE instead.
 */
export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id as string | undefined;
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const result = await spendCredit(userId);

        if (!result.ok && result.reason === "no_subscription") {
            // Failsafe for an account whose row was never created. It starts on
            // the free allowance and is charged for this call like any other —
            // the old version created the row and returned success without
            // taking anything, so the first generation was free.
            await db.subscriptions.create({
                data: { user_id: userId, credits_remaining: 2, credits_total: 3 },
            });
            return NextResponse.json({ success: true, remaining: 2 });
        }

        if (!result.ok) {
            return NextResponse.json({ error: "Insufficient Credits" }, { status: 403 });
        }

        return NextResponse.json({ success: true, remaining: result.remaining });
    } catch (error) {
        console.error("[CREDIT_DEDUCT]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
