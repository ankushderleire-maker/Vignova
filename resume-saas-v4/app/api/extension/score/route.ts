import { NextResponse } from "next/server";
import { getExtensionUser } from "@/lib/extensionAuth";
import { db } from "@/lib/db";
import { callBackend } from "@/lib/career-ops";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";

export const OPTIONS = handleCorsOptions;

export async function POST(req: Request) {
    try {
        const auth = await getExtensionUser(req);
        if (auth.error || !auth.user) {
            return withCors(NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 }));
        }

        const body = await req.json();
        const { jobDescription } = body;

        if (typeof jobDescription !== "string" || jobDescription.trim().length < 50 || jobDescription.length > 20000) {
            return withCors(NextResponse.json({ error: "Enter a job description between 50 and 20,000 characters." }, { status: 400 }));
        }

        // Fetch User's Primary Profile
        // We look for 'is_default' first, or fallback to the most recent one
        const profiles = await db.master_profiles.findMany({
            where: { user_id: auth.user.id },
            orderBy: { updated_at: 'desc' }
        });

        const profile = profiles.find(p => p.is_default) || profiles[0];

        if (!profile || !profile.parsed_data) {
            return withCors(NextResponse.json({ error: "No profile found. Please create a profile in the dashboard." }, { status: 404 }));
        }
        let data = profile.parsed_data as any;

        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch (e) {
                data = {};
            }
        }

        // Extract Logic based on main2.py ResumeSchema
        const summary = data.summary || "";
        let skillsStr = "";
        let userSkillsArray: string[] = [];

        // Handle Skills (can be string, array, or object based on historical data)
        const skills = data.skills;
        if (typeof skills === 'string') {
            skillsStr = skills;
            userSkillsArray = skills.split(",").map((s: string) => s.trim());
        } else if (Array.isArray(skills)) {
            skillsStr = skills.join(", ");
            userSkillsArray = skills;
        } else if (typeof skills === 'object' && skills !== null) {
            // Usually { technical: "...", soft: "..." }
            if (Array.isArray(skills.technical)) {
                skillsStr = skills.technical.join(", ");
                userSkillsArray = skills.technical;
            } else {
                skillsStr = skills.technical || "";
                userSkillsArray = skillsStr.split(",").map((s: string) => s.trim());
            }

            // Append soft skills if desired
            if (typeof skills.soft === 'string') {
                userSkillsArray = userSkillsArray.concat(skills.soft.split(",").map((s: string) => s.trim()));
            } else if (Array.isArray(skills.soft)) {
                userSkillsArray = userSkillsArray.concat(skills.soft);
            }
        }

        // Clean up empty strings
        userSkillsArray = userSkillsArray.filter((s: string) => s && s.length > 0);

        // Build Experience String
        let expStr = "";
        if (Array.isArray(data.experience)) {
            expStr = data.experience.map((exp: any) => {
                const desc = Array.isArray(exp.description) ? exp.description.join('\n') : (exp.description || "");
                return `${exp.role || ""} at ${exp.company || ""}\n${desc}`;
            }).join('\n\n');
        }

        // Build Projects String
        let projStr = "";
        if (Array.isArray(data.projects)) {
            projStr = data.projects.map((proj: any) => {
                const desc = Array.isArray(proj.description) ? proj.description.join('\n') : (proj.description || "");
                return `${proj.name || ""} (${proj.techStack || ""})\n${desc}`;
            }).join('\n\n');
        }

        // Build Education String
        let eduStr = "";
        if (Array.isArray(data.education)) {
            eduStr = data.education.map((edu: any) => {
                return `${edu.degree || ""} in ${edu.field || ""} from ${edu.school || ""}`;
            }).join('\n');
        }

        // Construct the profile string for the model
        const userProfileChunks = [
            summary ? `Professional Summary:\n${summary}` : "",
            skillsStr ? `Technical Skills:\n${skillsStr}` : "",
            expStr ? `Experience:\n${expStr}` : "",
            projStr ? `Projects:\n${projStr}` : "",
            eduStr ? `Education:\n${eduStr}` : ""
        ];

        const userProfile = userProfileChunks.filter(c => c.trim().length > 0).join('\n\n');

        console.log(`[EXTENSION_SCORE] Sending to Python: Profile Len=${userProfile.length}, JD Len=${jobDescription.length}, Skills=${userSkillsArray.length}`);

        const result = await callBackend<any>("/api/score-job", {
            method: "POST", timeoutMs: 60000, headers: { "X-Client-Id": auth.user.id },
            body: { userProfile, jobDescription, userSkills: userSkillsArray },
        });
        if (!result.ok || result.data?.error || !result.data?.breakdown) {
            return withCors(NextResponse.json({ error: "Keyword analysis is unavailable. Please try again." }, { status: 502 }));
        }
        return withCors(NextResponse.json({ success: true, ...result.data }));

    } catch (error) {
        console.error("[EXTENSION_SCORE]", error);
        return withCors(NextResponse.json({ error: "Failed to connect to AI scoring service. " }, { status: 500 }));
    }
}
