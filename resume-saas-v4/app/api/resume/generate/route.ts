import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { callBackend } from "@/lib/career-ops";
import { outOfCreditsBody, refundCredits, spendCredits } from "@/lib/credits";

export const maxDuration = 300;

/**
 * POST /api/resume/generate
 *
 * One tailored resume for one posting, for one tailoring credit.
 *
 * The credit is reserved before the model runs and given back if it fails.
 * This route used to check the balance first and charge after generating, so
 * several requests sent together could all pass the check on the last credit
 * and all generate. The late charge's result was never read either, so a
 * charge that failed simply cost nothing.
 */
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // spendCredits runs ensurePeriod first, so a bucket left over from an
    // earlier month is refilled rather than reported as empty.
    const spent = await spendCredits(userId, "tailoring");
    if (!spent.ok) {
        return NextResponse.json(outOfCreditsBody("tailoring", spent.remaining), { status: 403 });
    }

    // callBackend sends the internal API key, which the generation endpoints
    // require now that the backend no longer serves them to anyone who asks.
    const result = await callBackend("/api/generate-tailored-resume", {
        method: "POST",
        body,
        timeoutMs: 280_000,
    });

    if (!result.ok) {
        await refundCredits(userId, "tailoring", "resume generation failed");
        console.error("[RESUME_GENERATE] Backend returned", result.status, result.error);
        return NextResponse.json(
            { error: "Resume generation failed. No credit was used, please try again." },
            { status: result.status >= 500 ? 502 : result.status }
        );
    }

    return NextResponse.json({ ...(result.data as object), credits_remaining: spent.remaining });
}
