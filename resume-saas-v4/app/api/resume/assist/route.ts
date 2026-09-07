import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { callBackend } from "@/lib/career-ops";

export const maxDuration = 120;

/**
 * POST /api/resume/assist
 *
 * Fronts the resume assistant agents in the FastAPI backend:
 *   { action: "summary" }  -> three rewrites of the professional summary
 *   { action: "skills"  }  -> job skills the resume is missing
 *
 * The browser only ever talks to this route. `callBackend` adds the internal
 * API key, so the provider key, the model and the prompts stay server-side.
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any = {};
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const action = body?.action;
    if (action !== "summary" && action !== "skills") {
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const path = action === "summary" ? "/api/resume/summary-variants" : "/api/resume/suggest-skills";

    const payload =
        action === "summary"
            ? {
                  currentSummary: typeof body.currentSummary === "string" ? body.currentSummary : "",
                  jobTitle: body.jobTitle || null,
                  company: body.company || null,
                  jobDescription: body.jobDescription || null,
                  skills: Array.isArray(body.skills) ? body.skills.slice(0, 40) : null,
                  experience: Array.isArray(body.experience) ? body.experience.slice(0, 8) : null,
              }
            : {
                  currentSkills: Array.isArray(body.currentSkills) ? body.currentSkills.slice(0, 60) : null,
                  jobDescription: body.jobDescription || null,
                  jobTitle: body.jobTitle || null,
              };

    const result = await callBackend<any>(path, {
        method: "POST",
        timeoutMs: 90_000,
        // Lets the backend rate-limit per user instead of per (shared) server IP.
        headers: { "X-Client-Id": userId },
        body: payload,
    });

    if (!result.ok) {
        return NextResponse.json(
            { error: result.error || "The AI assistant is unavailable right now." },
            { status: result.status || 500 }
        );
    }

    return NextResponse.json(result.data);
}
