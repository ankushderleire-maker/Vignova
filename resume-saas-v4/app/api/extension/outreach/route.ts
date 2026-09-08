import { NextResponse } from "next/server";
import { getExtensionUser } from "@/lib/extensionAuth";
import { db } from "@/lib/db";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";
import { callBackend } from "@/lib/career-ops";

export const OPTIONS = handleCorsOptions;

/**
 * Writes a recruiter message or an application email for a job the user is
 * looking at in the extension.
 *
 * The extension is packed JavaScript anyone can unzip, so it never talks to the
 * AI service directly — it calls this route with its own session, and this route
 * calls the backend with the internal key. The candidate details come from the
 * user's master profile on the server rather than from the request body, so the
 * extension cannot be used to put words in someone else's mouth.
 */

type Action = "hr-message" | "email";

const ENDPOINTS: Record<Action, string> = {
    "hr-message": "/api/outreach/hr-message",
    email: "/api/outreach/email",
};

/** Pulls the few fields the writer needs out of a master profile blob. */
function candidateFrom(parsed: any) {
    if (!parsed || typeof parsed !== "object") return {};

    const skills = Array.isArray(parsed.skills)
        ? parsed.skills.filter((s: unknown) => typeof s === "string")
        : typeof parsed.skills === "object" && parsed.skills
            ? Object.values(parsed.skills).flatMap((v) =>
                typeof v === "string" ? v.split(/,\s*/) : Array.isArray(v) ? v : []
            )
            : [];

    const experience = Array.isArray(parsed.experience)
        ? parsed.experience
            .slice(0, 6)
            .map((e: any) => {
                const role = [e?.role, e?.company].filter(Boolean).join(" at ");
                const first = Array.isArray(e?.description) ? e.description[0] : e?.description;
                return [role, typeof first === "string" ? first : null].filter(Boolean).join(" — ");
            })
            .filter(Boolean)
        : [];

    return {
        fullName: typeof parsed.fullName === "string" ? parsed.fullName : undefined,
        currentTitle: typeof parsed.jobTitle === "string" ? parsed.jobTitle : undefined,
        summary: typeof parsed.summary === "string" ? parsed.summary : undefined,
        skills: skills.slice(0, 20),
        experience,
    };
}

export async function POST(req: Request) {
    try {
        const auth = await getExtensionUser(req);
        if (auth.error || !auth.user) {
            return withCors(
                NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 })
            );
        }
        const user = auth.user;

        const body = await req.json();
        const action: Action = body.action === "email" ? "email" : "hr-message";
        const { jobTitle, company, jobDescription, recipient, source } = body;

        if (!jobTitle && !jobDescription) {
            return withCors(
                NextResponse.json({ error: "A job title or description is required." }, { status: 400 })
            );
        }

        const profile = await db.master_profiles.findFirst({
            where: { user_id: user.id },
            orderBy: [{ is_default: "desc" }, { created_at: "asc" }],
            select: { parsed_data: true },
        });

        const result = await callBackend<any>(ENDPOINTS[action], {
            method: "POST",
            timeoutMs: 90_000,
            // Lets the backend rate-limit per user rather than per (shared) server IP.
            headers: { "X-Client-Id": user.id },
            body: {
                jobTitle,
                company,
                recipient,
                jobDescription,
                source,
                ...candidateFrom(profile?.parsed_data),
            },
        });

        if (!result.ok) {
            return withCors(
                NextResponse.json(
                    { error: result.error || "The AI writer is unavailable right now." },
                    { status: result.status || 500 }
                )
            );
        }

        return withCors(NextResponse.json(result.data));
    } catch (error) {
        console.error("[EXTENSION_OUTREACH]", error);
        return withCors(NextResponse.json({ error: "Could not write that right now." }, { status: 500 }));
    }
}
