import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { getSmartMatchJobs } from "@/lib/adzunaService";

/**
 * GET /api/jobs/smart-match
 * Fetch personalized job suggestions based on user's default Master Profile.
 */
export async function GET() {
    try {
        const session: any = await getServerSession(authOptions);
        if (!(session?.user as any)?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session?.user as any)?.id as string;

        // 1. Get the user's default master profile, OR the most recent one
        let profile = await db.master_profiles.findFirst({
            where: {
                user_id: userId,
                is_default: true,
            },
        });

        // Fallback: If no default profile, get the most recently updated one
        if (!profile) {
            profile = await db.master_profiles.findFirst({
                where: { user_id: userId },
                orderBy: { updated_at: "desc" },
            });
        }

        if (!profile) {
            console.log("[SMART_MATCH] No profile found for user:", userId);
            return NextResponse.json(
                {
                    error: "no_profile",
                    message: "Please create a Master Profile first to get personalized job suggestions.",
                },
                { status: 404 }
            );
        }

        console.log("[SMART_MATCH] Profile found:", profile.id, profile.name);
        // 2. Extract relevant data from parsed_data
        const parsedData = (profile.parsed_data as any) || {};
        const jobTitle = parsedData.jobTitle || "";
        const technicalSkills = parsedData.skills?.technical || "";
        const location = parsedData.location || "";

        // 3. Validate minimum required data
        if (!jobTitle || jobTitle.trim() === "") {
            return NextResponse.json(
                {
                    error: "incomplete_profile",
                    message: `Your profile "${profile.name}" is missing a Job Title. Please add one to get relevant suggestions.`,
                },
                { status: 400 }
            );
        }

        // 4. Fetch jobs from Adzuna via our service
        const jobs = await getSmartMatchJobs(userId, jobTitle, technicalSkills, location);

        if (jobs.length === 0) {
            return NextResponse.json({
                jobs: [],
                message: "No exact matches found. Try updating your skills or job title.",
                query_info: { jobTitle, location },
            });
        }

        return NextResponse.json({
            jobs,
            query_info: { jobTitle, location, skillsUsed: technicalSkills },
        });
    } catch (error: any) {
        console.error("[SMART_MATCH_GET]", error);

        // Handle Adzuna credential errors gracefully
        if (error.message?.includes("credentials")) {
            return NextResponse.json(
                { error: "config_error", message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: "internal_error", message: `Failed to fetch jobs: ${error.message}` },
            { status: 500 }
        );
    }
}
