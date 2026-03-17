import { NextResponse } from "next/server";
import { getExtensionUser } from "@/lib/extensionAuth";
import { db } from "@/lib/db";
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

        if (!jobDescription) {
            return withCors(NextResponse.json({ error: "Missing job description" }, { status: 400 }));
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

        // Call Python Backend
        // Assuming backend runs on port 8000 locally
        // In production, this would be an ENV variable
        const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://localhost:8000";

        const scoreRes = await fetch(`${PYTHON_API_URL}/api/score-job`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userProfile,
                jobDescription,
                userSkills: userSkillsArray
            })
        });

        if (!scoreRes.ok) {
            const errText = await scoreRes.text();
            console.error("Python Scoring API Error:", errText);
            return withCors(NextResponse.json({ error: "Failed to calculate score. Backend service optional." }, { status: 500 }));
        }

        const scoreData = await scoreRes.json();

        return withCors(NextResponse.json({
            success: true,
            ...scoreData
        }));

    } catch (error) {
        console.error("[EXTENSION_SCORE]", error);
        return withCors(NextResponse.json({ error: "Failed to connect to AI scoring service. Ensure Python backend is running." }, { status: 500 }));
    }
}
