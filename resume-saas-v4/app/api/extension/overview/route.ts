import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getExtensionUser } from "@/lib/extensionAuth";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";
import { startOfWeek } from "@/lib/extensionDashboard";

export const OPTIONS = handleCorsOptions;

export async function GET(req: Request) {
    try {
        const auth = await getExtensionUser(req);
        if (auth.error || !auth.user) return withCors(NextResponse.json({ error: auth.error }, { status: auth.status }));
        const userId = auth.user.id;
        const since = startOfWeek();
        const [jobs, saved, applications, resumes, interviews] = await Promise.all([
            db.jobApplication.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 5,
                select: { id: true, jobTitle: true, company: true, location: true, companyLogo: true, jobUrl: true,
                    description: true, status: true, matchScore: true, createdAt: true, updatedAt: true,
                    _count: { select: { generatedResumes: true, atsReports: true } } } }),
            db.jobApplication.count({ where: { userId, createdAt: { gte: since } } }),
            db.jobApplication.count({ where: { userId, updatedAt: { gte: since }, status: { in: ["APPLIED", "INTERVIEW", "OFFER", "REJECTED"] } } }),
            db.generatedResume.count({ where: { userId, createdAt: { gte: since } } }),
            db.jobApplication.count({ where: { userId, status: "INTERVIEW", updatedAt: { gte: since } } }),
        ]);
        return withCors(NextResponse.json({ success: true, jobs: jobs.map(({ _count, ...job }) => ({ ...job,
            hasResume: _count.generatedResumes > 0, analyzed: _count.atsReports > 0 })),
            stats: { saved, applications, resumes, interviews, since: since.toISOString(), timezone: "UTC" } },
            { headers: { "Cache-Control": "no-store" } }));
    } catch (error) {
        console.error("[EXTENSION_OVERVIEW]", error);
        return withCors(NextResponse.json({ error: "Could not load your job activity." }, { status: 500 }));
    }
}
