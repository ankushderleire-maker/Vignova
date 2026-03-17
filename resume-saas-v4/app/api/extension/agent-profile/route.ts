import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getExtensionUser } from "@/lib/extensionAuth";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";

// CORS preflight
export async function OPTIONS() {
    return handleCorsOptions();
}

/**
 * GET /api/extension/agent-profile
 * Returns the user's active Master Profile personal details for the auto-apply agent.
 *
 * Headers: Authorization: Bearer <token>
 * Response: { profile: { first_name, last_name, email, phone, linkedin, github, portfolio, city, ... } }
 */
export async function GET(req: Request) {
    try {
        // Auth Check
        const auth = await getExtensionUser(req);
        if (auth.error) {
            return withCors(NextResponse.json(
                { error: auth.error },
                { status: auth.status }
            ));
        }

        const { user } = auth;
        const userId = user!.id;

        // Fetch default profile (or fallback to first)
        let profile = await db.master_profiles.findFirst({
            where: { user_id: userId, is_default: true },
            select: { id: true, name: true, parsed_data: true },
        });

        if (!profile) {
            profile = await db.master_profiles.findFirst({
                where: { user_id: userId },
                orderBy: { created_at: "desc" },
                select: { id: true, name: true, parsed_data: true },
            });
        }

        if (!profile || !profile.parsed_data) {
            return withCors(NextResponse.json(
                { error: "No Master Profile found. Please create one on the dashboard." },
                { status: 404 }
            ));
        }

        let data = profile.parsed_data as any;

        // Prisma Json fields sometimes return as stringified JSON if stored that way
        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch (e) {
                data = {};
            }
        }

        // Split fullName into first/last
        const fullName = data?.fullName || data?.full_name || "";
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        // Extract personal details section if it exists
        const personalDetails = data.personalDetails || data.personal_details || {};

        // Map Education
        const parsedEducation = Array.isArray(data.education) ? data.education.map((edu: any) => ({
            school: edu.school || edu.institution || "",
            degree: edu.degree || edu.qualification || "",
            field: edu.field || edu.major || "",
            grade: edu.grade || edu.gpa || "",
            start_date: edu.startDate || edu.start_date || "",
            end_date: edu.endDate || edu.end_date || "",
        })) : [];

        // Map Experience
        const parsedExperience = Array.isArray(data.experience) ? data.experience.map((exp: any) => ({
            company: exp.company || exp.employer || "",
            title: exp.title || exp.jobTitle || exp.role || "",
            location: exp.location || "",
            start_date: exp.startDate || exp.start_date || "",
            end_date: exp.endDate || exp.end_date || "",
            description: exp.description || "",
        })) : [];

        // Map Projects
        const parsedProjects = Array.isArray(data.projects) ? data.projects.map((proj: any) => ({
            name: proj.name || proj.title || "",
            tech_stack: proj.techStack || proj.tech_stack || proj.technologies || "",
            link: proj.link || proj.url || "",
            description: proj.description || "",
        })) : [];

        // Map Certifications
        const parsedCertifications = Array.isArray(data.certifications) ? data.certifications.map((cert: any) => ({
            name: cert.name || cert.title || "",
            issuer: cert.issuer || cert.organization || "",
            date: cert.date || cert.issue_date || "",
            url: cert.url || cert.link || "",
        })) : [];

        // Map Languages
        const parsedLanguages = Array.isArray(data.languages) ? data.languages.map((lang: any) => ({
            name: lang.name || lang.language || "",
            proficiency: lang.proficiency || lang.level || "",
        })) : [];

        // Build the agent profile from Master Profile data
        const agentProfile = {
            first_name: firstName || personalDetails.firstName || personalDetails.first_name || "",
            last_name: lastName || personalDetails.lastName || personalDetails.last_name || "",
            email: data.email || personalDetails.email || user!.email || "",
            phone: data.phone || personalDetails.phone || personalDetails.mobile || "",
            linkedin: data.linkedin || personalDetails.linkedin || data.socialLinks?.linkedin || "",
            github: data.github || personalDetails.github || data.socialLinks?.github || "",
            portfolio: data.portfolio || data.website || personalDetails.website || personalDetails.portfolio || "",
            city: data.location || personalDetails.city || personalDetails.location || "",
            state: personalDetails.state || "",
            country: personalDetails.country || "",
            current_title: data.jobTitle || data.currentTitle || "",
            current_company: data.currentCompany || "",
            years_experience: data.yearsExperience || personalDetails.yearsExperience || "",
            work_authorized: personalDetails.workAuthorized || "Yes",
            visa_status: data.visaStatus || data.visa_status || personalDetails.visaStatus || personalDetails.visa_status || "",
            needs_sponsorship: personalDetails.needsSponsorship || "No",
            address: personalDetails.address || "",
            zip_code: personalDetails.zipCode || personalDetails.zip_code || "",
            summary: data.summary || data.professionalSummary || data.about || "",
            education: parsedEducation,
            experience: parsedExperience,
            projects: parsedProjects,
            certifications: parsedCertifications,
            languages: parsedLanguages,
            skills: Array.isArray(data.skills)
                ? data.skills
                : (typeof data.skills === 'string' ? data.skills.split(",") : []),
        };

        return withCors(NextResponse.json({
            success: true,
            profileName: profile.name,
            profile: agentProfile,
        }));

    } catch (error) {
        console.error("[EXTENSION_AGENT_PROFILE]", error);
        return withCors(NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        ));
    }
}
