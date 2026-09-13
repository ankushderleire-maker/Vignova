import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { spendCredits, creditBalance } from "@/lib/credits";

export const maxDuration = 300;

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Check the tailoring allowance — do NOT deduct yet
    // ensurePeriod() inside creditBalance also refills a bucket left over from
    // an earlier month.
    if ((await creditBalance(userId, "tailoring")) <= 0) {
        return NextResponse.json(
            { error: "You're out of tailoring credits.", bucket: "tailoring", outOfCredits: true },
            { status: 403 }
        );
    }

    // 2. Forward request to Python backend
    const body = await req.json();
    const AI_BACKEND_URL = process.env.AI_BACKEND_URL || "http://localhost:8000";

    let backendRes: Response;
    try {
        backendRes = await fetch(`${AI_BACKEND_URL}/api/generate-tailored-resume`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            // @ts-ignore — Node 18 AbortSignal.timeout
            signal: AbortSignal.timeout(280_000),
        });
    } catch (err) {
        console.error("[RESUME_GENERATE] Backend unreachable:", err);
        return NextResponse.json({ error: "Backend service unavailable. Please try again." }, { status: 503 });
    }

    if (!backendRes.ok) {
        const errText = await backendRes.text().catch(() => "");
        console.error("[RESUME_GENERATE] Backend returned", backendRes.status, errText);
        return NextResponse.json(
            { error: "Resume generation failed. Please try again." },
            { status: backendRes.status >= 500 ? 502 : backendRes.status },
        );
    }

    // 3. Generation succeeded — charge for it, atomically and last, so a
    //    concurrent request cannot spend the same credit twice.
    const data = await backendRes.json();
    await spendCredits(userId, "tailoring");

    return NextResponse.json(data);
}
