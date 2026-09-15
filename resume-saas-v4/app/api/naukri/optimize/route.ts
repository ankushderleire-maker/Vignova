import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { callBackend } from "@/lib/career-ops";
import { ensurePeriod, notOnPlanBody, outOfCreditsBody, refundCredits, spendCredits } from "@/lib/credits";
import { db } from "@/lib/db";
import { jsonObject } from "@/lib/extensionDashboard";
import { sanitizeNaukriProfile } from "@/lib/naukri-profile";

export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/naukri/optimize
 *
 * AI rewrite of a stored Naukri profile. Body: { analysisId, masterProfileId? }.
 * Priced like LinkedIn optimization and behind the same plan switch: one
 * writing credit, reserved before the model runs and refunded if it fails.
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (typeof body?.analysisId !== "string" || !body.analysisId) {
        return NextResponse.json({ error: "Missing analysisId" }, { status: 400 });
    }

    const limits = await ensurePeriod(userId);
    if (!limits.has_linkedin_optimization) {
        return NextResponse.json(notOnPlanBody("Naukri optimization", limits.plan_type), { status: 403 });
    }

    // Looked up before any credit moves, so a missing analysis costs nothing.
    const analysis = await db.naukriAnalysis.findFirst({ where: { id: body.analysisId, userId } });
    const profile = analysis ? sanitizeNaukriProfile(analysis.rawProfileData) : null;
    if (!analysis || !profile) {
        return NextResponse.json({ error: "Naukri analysis not found." }, { status: 404 });
    }

    const masterProfileId = typeof body.masterProfileId === "string" && UUID.test(body.masterProfileId) ? body.masterProfileId : null;
    const master = await db.master_profiles.findFirst({
        where: masterProfileId ? { id: masterProfileId, user_id: userId } : { user_id: userId },
        orderBy: [{ is_default: "desc" }, { updated_at: "desc" }],
    });

    const spent = await spendCredits(userId, "writing");
    if (!spent.ok) {
        return NextResponse.json(outOfCreditsBody("writing", spent.remaining), { status: 403 });
    }

    const result = await callBackend<Record<string, unknown>>("/api/naukri/optimize", {
        method: "POST",
        timeoutMs: 240_000,
        headers: { "X-Client-Id": userId },
        body: { userId, profile, masterProfile: master ? jsonObject(master.parsed_data) : null },
    });
    if (!result.ok || !result.data) {
        await refundCredits(userId, "writing", "naukri optimization failed");
        return NextResponse.json(
            { error: `${result.error || "AI optimization failed."} No credit was used.` },
            { status: result.status || 500 }
        );
    }

    const optimizedContent = { ...result.data, createdAt: new Date().toISOString() };
    let saved = true;
    try {
        await db.naukriAnalysis.update({
            where: { id: analysis.id },
            data: { optimizedContent: optimizedContent as Prisma.InputJsonValue },
        });
    } catch (error) {
        // The credit is spent and the rewrite exists, so it still goes back to
        // the user, and the page says it will not be there after a reload.
        saved = false;
        console.error("[NAUKRI_OPTIMIZE] could not store the rewrite", error);
    }

    return NextResponse.json({ ...optimizedContent, saved, credits_remaining: spent.remaining });
}
