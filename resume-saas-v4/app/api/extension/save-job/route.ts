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
        const user = auth.user;

        const body = await req.json();
        const {
            jobTitle,
            company,
            location,
            jobUrl,
            salary,
            description,
            source = "extension"
        } = body;

        if (!jobTitle || !company) {
            return withCors(NextResponse.json({ error: "Missing required fields" }, { status: 400 }));
        }

        // Check if job already exists for this user (by URL) to avoid duplicates
        // If it exists, we return the existing one.
        const existingJob = await db.jobApplication.findFirst({
            where: {
                userId: user.id,
                jobUrl: jobUrl,
            },
        });

        if (existingJob) {
            // Update the existing job with the latest scraped data just in case it was a bad scrape previously
            await db.jobApplication.update({
                where: { id: existingJob.id },
                data: {
                    jobTitle,
                    company,
                    location,
                    description,
                    salary,
                }
            });

            return withCors(NextResponse.json({
                success: true,
                jobId: existingJob.id,
                message: "Job updated with latest details"
            }));
        }

        const job = await db.jobApplication.create({
            data: {
                userId: user.id,
                jobTitle,
                company,
                location,
                jobUrl,
                salary,
                description,
                source,
                sourceUrl: jobUrl,
                status: "SAVED",
            },
        });

        return withCors(NextResponse.json({
            success: true,
            jobId: job.id,
            message: "Job saved successfully"
        }));

    } catch (error) {
        console.error("[EXTENSION_SAVE_JOB]", error);
        return withCors(NextResponse.json({ error: "Internal Error" }, { status: 500 }));
    }
}
