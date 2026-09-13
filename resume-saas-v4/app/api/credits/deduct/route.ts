import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { spendCredits } from "@/lib/credits";
import { BUCKET_LABELS, isBucket, type Bucket } from "@/lib/planLimits";

/**
 * POST /api/credits/deduct
 *
 * Reserves one credit from a bucket before a paid operation. Pair it with
 * /api/credits/refund on the failure path, passing the same bucket — a
 * reserved credit that is never settled is a credit the user paid for nothing,
 * and one settled against the wrong bucket refunds the wrong currency.
 *
 * Body: { bucket?: "tailoring" | "writing" | "interview" }, default tailoring.
 *
 * This used to read the balance, subtract one in JavaScript and write it back,
 * so two concurrent requests could both read the same number and both write
 * the same decrement: one credit, two generations. spendCredits does it in a
 * single conditional UPDATE instead.
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id as string | undefined;
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        let bucket: Bucket = "tailoring";
        try {
            const body = await req.json();
            if (typeof body?.bucket === "string" && isBucket(body.bucket)) bucket = body.bucket;
        } catch {
            // No body is fine — the default covers the original callers.
        }

        // ensurePeriod() runs inside spendCredits, so an account with no bucket
        // rows yet (or rows left from an earlier month) is topped up here
        // rather than being told it has no credits.
        const result = await spendCredits(userId, bucket);

        if (!result.ok) {
            return NextResponse.json(
                {
                    error: `You're out of ${BUCKET_LABELS[bucket].toLowerCase()}.`,
                    bucket,
                    outOfCredits: true,
                    remaining: result.remaining,
                },
                { status: 403 }
            );
        }

        return NextResponse.json({ success: true, bucket, remaining: result.remaining });
    } catch (error) {
        console.error("[CREDIT_DEDUCT]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
