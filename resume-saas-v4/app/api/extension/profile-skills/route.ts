import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getExtensionUser } from "@/lib/extensionAuth";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";
import { activeExtensionProfile, jsonObject } from "@/lib/extensionDashboard";
import { cleanSkillName } from "@/lib/linkedin-skills";
import { withSkill } from "@/lib/profileSkills";

const MAX_SKILL_LENGTH = 60;

export async function OPTIONS() {
    return handleCorsOptions();
}

/**
 * POST /api/extension/profile-skills
 *
 * Adds one skill to the Master Profile the extension scores against, from the
 * "Missing keywords" pills on a job page. Body: { skill: string }.
 *
 * It is the same profile activeExtensionProfile hands every extension route,
 * so the next score of the posting already counts the new skill.
 */
export async function POST(req: Request) {
    try {
        const auth = await getExtensionUser(req);
        if (auth.error || !auth.user) {
            return withCors(NextResponse.json({ error: auth.error }, { status: auth.status }));
        }

        const body = await req.json().catch(() => null);
        const skill = cleanSkillName(body?.skill);
        if (!skill || skill.length > MAX_SKILL_LENGTH) {
            return withCors(
                NextResponse.json({ error: `Send a skill name of up to ${MAX_SKILL_LENGTH} characters.` }, { status: 400 })
            );
        }

        const profile = await activeExtensionProfile(auth.user.id);
        if (!profile) {
            return withCors(NextResponse.json({ error: "Create a Master Profile on Vignova first." }, { status: 404 }));
        }

        const data = jsonObject(profile.parsed_data);
        const { skills, added } = withSkill(data.skills, skill);
        if (added) {
            await db.master_profiles.update({
                where: { id: profile.id },
                data: { parsed_data: { ...data, skills } as Prisma.InputJsonValue },
            });
        }

        return withCors(
            NextResponse.json({ success: true, added, skill, profileId: profile.id, profileName: profile.name })
        );
    } catch (error) {
        console.error("[EXTENSION_PROFILE_SKILLS]", error);
        return withCors(NextResponse.json({ error: "Could not add this skill." }, { status: 500 }));
    }
}
