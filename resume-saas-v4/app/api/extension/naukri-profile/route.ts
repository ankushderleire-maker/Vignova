import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { callBackend } from "@/lib/career-ops";
import { getExtensionUser } from "@/lib/extensionAuth";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";
import { activeExtensionProfile, jsonObject } from "@/lib/extensionDashboard";
import { sanitizeNaukriProfile } from "@/lib/naukri-profile";

export const maxDuration = 120;

export async function OPTIONS() {
    return handleCorsOptions();
}

/**
 * POST /api/extension/naukri-profile
 *
 * The Naukri profile the extension read off naukri.com. It is scored against
 * the Master Profile the extension works with and stored, and the analysis id
 * goes back so the extension can open it in the dashboard. Scoring is free;
 * the AI rewrite, started from the dashboard, spends a writing credit.
 */
export async function POST(req: Request) {
    try {
        const auth = await getExtensionUser(req);
        if (auth.error || !auth.user) {
            return withCors(NextResponse.json({ error: auth.error }, { status: auth.status }));
        }
        const userId = auth.user.id;

        const body = await req.json().catch(() => null);
        const profile = sanitizeNaukriProfile(body?.profile);
        if (!profile) {
            return withCors(
                NextResponse.json(
                    { error: "No profile was found on that page. Open your Naukri profile and let it load fully." },
                    { status: 400 }
                )
            );
        }

        const master = await activeExtensionProfile(userId);
        const scored = await callBackend<{ overallScore?: number; sectionScores?: unknown; recommendations?: unknown }>("/api/naukri/analyze", {
            method: "POST",
            timeoutMs: 90_000,
            headers: { "X-Client-Id": userId },
            body: { userId, profile, masterProfile: master ? jsonObject(master.parsed_data) : null },
        });
        if (!scored.ok || !scored.data) {
            console.error("[EXTENSION_NAUKRI_PROFILE]", scored.status, scored.error);
            return withCors(
                NextResponse.json({ error: "Vignova couldn't score your profile right now. Try again in a moment." }, { status: 502 })
            );
        }

        const analysis = await db.naukriAnalysis.create({
            data: {
                userId,
                profileUrl: profile.profileUrl,
                masterProfileId: master?.id ?? null,
                overallScore: typeof scored.data.overallScore === "number" ? scored.data.overallScore : null,
                sectionScores: (scored.data.sectionScores ?? {}) as Prisma.InputJsonValue,
                recommendations: (scored.data.recommendations ?? []) as Prisma.InputJsonValue,
                rawProfileData: profile as unknown as Prisma.InputJsonValue,
            },
        });

        return withCors(NextResponse.json({ success: true, analysisId: analysis.id, overallScore: analysis.overallScore }));
    } catch (error) {
        console.error("[EXTENSION_NAUKRI_PROFILE]", error);
        return withCors(NextResponse.json({ error: "Could not save your Naukri profile." }, { status: 500 }));
    }
}
