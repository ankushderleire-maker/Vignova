import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { refundCredit, creditBalance } from "@/lib/credits";

/**
 * POST /api/credits/refund
 *
 * Returns a credit reserved by /api/credits/deduct when the work it was
 * reserved for failed. Called from the error path of the operations that
 * reserve up front — the ATS report, interview prep and the LinkedIn
 * optimiser — so a failed generation costs nothing.
 *
 * Body: { reason?: string } — logged, so a spike in refunds points at whatever
 * is failing rather than just showing up as balances that do not add up.
 *
 * Deliberately always answers 200: it runs on a path where something has
 * already gone wrong, and a failure here must not replace the caller's real
 * error message with a second one. A refund that could not be applied is
 * logged loudly instead.
 */
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let reason = "unspecified";
    try {
        const body = await req.json();
        if (typeof body?.reason === "string") reason = body.reason.slice(0, 200);
    } catch {
        // No body is fine.
    }

    await refundCredit(userId, reason);
    return NextResponse.json({ success: true, remaining: await creditBalance(userId) });
}
