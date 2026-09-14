import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { callBackend } from "@/lib/career-ops";
import { db } from "@/lib/db";
import { jsonObject } from "@/lib/extensionDashboard";
import { sanitizeNaukriProfile } from "@/lib/naukri-profile";

export const maxDuration = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/naukri/analyze
 *
 * Re-scores a stored Naukri profile against the Master Profile picked on the
 * page. Body: { analysisId, masterProfileId? }. Free, since nothing is written
 * by a model; an existing rewrite is kept.
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

    const analysis = await db.naukriAnalysis.findFirst({ where: { id: body.analysisId, userId } });
    const profile = analysis ? sanitizeNaukriProfile(analysis.rawProfileData) : null;
    if (!analysis || !profile) {
        return NextResponse.json({ error: "Naukri analysis not found." }, { status: 404 });
    }

    const masterProfileId = typeof body.masterProfileId === "string" && UUID.test(body.masterProfileId) ? body.masterProfileId : null;
    const master = masterProfileId
        ? await db.master_profiles.findFirst({ where: { id: masterProfileId, user_id: userId } })
        : null;

    const scored = await callBackend<{ overallScore?: number; sectionScores?: unknown; recommendations?: unknown }>("/api/naukri/analyze", {
        method: "POST",
        timeoutMs: 90_000,
        headers: { "X-Client-Id": userId },
        body: { userId, profile, masterProfile: master ? jsonObject(master.parsed_data) : null },
    });
    if (!scored.ok || !scored.data) {
        console.error("[NAUKRI_ANALYZE]", scored.status, scored.error);
        return NextResponse.json({ error: "Could not score the profile right now. Try again in a moment." }, { status: 502 });
    }

    const updated = await db.naukriAnalysis.update({
        where: { id: analysis.id },
        data: {
            masterProfileId: master?.id ?? null,
            overallScore: typeof scored.data.overallScore === "number" ? scored.data.overallScore : null,
            sectionScores: (scored.data.sectionScores ?? {}) as Prisma.InputJsonValue,
            recommendations: (scored.data.recommendations ?? []) as Prisma.InputJsonValue,
        },
    });
    return NextResponse.json({ result: updated });
}
