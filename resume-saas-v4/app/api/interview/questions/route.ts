import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { spendCredits, refundCredits } from "@/lib/credits";

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || "http://localhost:8000";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // Fetch user's master profile to personalise questions
    let userProfile: any = null;
    try {
        const whereClause: any = { user_id: userId };
        if (body.profileId) {
            whereClause.id = body.profileId;
        } else {
            whereClause.is_default = true;
        }
        
        let profileRow = await db.master_profiles.findFirst({
            where: whereClause,
        });

        if (!profileRow && !body.profileId) {
            profileRow = await db.master_profiles.findFirst({
                where: { user_id: userId },
                orderBy: { updated_at: "desc" },
            });
        }
        
        userProfile = profileRow?.parsed_data ?? null;
    } catch (_) {}

    // Metered against the interview bucket. The extension's interview route
    // already charged a credit while this one — the same generation, reached
    // from the dashboard — was free, so anyone could route around the charge.
    // One credit buys a whole set of questions for one job.
    const spent = await spendCredits(userId, "interview");
    if (!spent.ok) {
        return NextResponse.json(
            { error: "You're out of interview credits.", bucket: "interview", outOfCredits: true },
            { status: 403 }
        );
    }

    const res = await fetch(`${AI_BACKEND_URL}/api/interview/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, user_profile: userProfile }),
    });

    let data;
    try {
        data = await res.json();
    } catch (err) {
        await refundCredits(userId, "interview", "interview questions returned invalid JSON");
        return NextResponse.json(
            { error: "AI service returned an invalid response. Please try again." },
            { status: 502 }
        );
    }

    // Nothing usable came back: charge nothing.
    if (!res.ok || !Array.isArray(data?.questions) || data.questions.length === 0) {
        await refundCredits(userId, "interview", "interview questions generation failed");
    }
    
    // If successfully generated, save to database
    if (res.ok && data.questions && Array.isArray(data.questions)) {
        try {
            await db.savedInterview.create({
                data: {
                    userId,
                    jobId: body.jobId || null,
                    source: body.source || "profile",
                    questions: data.questions
                }
            });
        } catch (err) {
            console.error("Failed to save interview questions to DB:", err);
            // We don't fail the request if saving fails
        }
    }

    return NextResponse.json(data, { status: res.status });
}
