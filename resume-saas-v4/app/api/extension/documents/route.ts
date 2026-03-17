import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getExtensionUser } from "@/lib/extensionAuth";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";

export async function OPTIONS() {
    return handleCorsOptions();
}

/**
 * GET /api/extension/documents
 * Returns a list of the user's generated resumes and cover letters.
 */
export async function GET(req: Request) {
    try {
        const auth = await getExtensionUser(req);
        if (auth.error) {
            return withCors(NextResponse.json({ error: auth.error }, { status: auth.status }));
        }

        const userId = auth.user!.id;

        // Fetch Generated Resumes
        const resumes = await db.generatedResume.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
                id: true,
                name: true,
                createdAt: true,
                jobId: true,
            }
        });

        // Fetch Cover Letters (attached to jobs)
        const jobsWithLetters = await db.jobApplication.findMany({
            where: {
                userId,
                coverLetter: { not: "" }
            },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
                id: true,
                jobTitle: true,
                company: true,
                createdAt: true,
            }
        });

        const documents = [
            ...resumes.map(r => ({
                id: r.id,
                type: "resume",
                name: r.name || "Untitled Resume",
                jobId: r.jobId,
                createdAt: r.createdAt.toISOString()
            })),
            ...jobsWithLetters.map(j => ({
                id: j.id, // Using jobId as the identifier for the cover letter
                type: "cover_letter",
                name: `Cover Letter - ${j.jobTitle} at ${j.company}`,
                jobId: j.id,
                createdAt: j.createdAt.toISOString()
            }))
        ];

        // Sort combined list by date descending
        documents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return withCors(NextResponse.json({ success: true, documents }));
    } catch (error: any) {
        console.error("[EXT_DOCUMENTS_GET]", error);
        return withCors(NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 }));
    }
}
