import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export const maxDuration = 300;

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Check credits — do NOT deduct yet
    const sub = await db.subscriptions.findFirst({ where: { user_id: userId } });
    if (!sub || sub.credits_remaining <= 0) {
        return NextResponse.json({ error: "Insufficient Credits" }, { status: 403 });
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

    // 3. Generation succeeded — deduct credit atomically
    const data = await backendRes.json();

    await db.subscriptions.update({
        where: { id: sub.id },
        data: { credits_remaining: { decrement: 1 } },
    });

    return NextResponse.json(data);
}
