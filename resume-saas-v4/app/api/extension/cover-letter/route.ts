import { NextResponse } from "next/server";
import { getExtensionUser } from "@/lib/extensionAuth";
import { db } from "@/lib/db";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";
import { findJobByUrl } from "@/lib/extensionDuplicate";
import { checkAiAccess } from "@/lib/extensionPlan";
import { callBackend } from "@/lib/career-ops";
import { spendCredits, refundCredits } from "@/lib/credits";

export const maxDuration = 120;

export const OPTIONS = handleCorsOptions;

export async function POST(req: Request) {
    let reservedFor: string | null = null;
    try {
        const auth = await getExtensionUser(req);
        if (auth.error || !auth.user) {
            return withCors(NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 }));
        }
        const user = auth.user;

        const body = await req.json();
        const { jobTitle, company, jobUrl, description, force = false } = body;

        // Writing a letter calls a model, so it is Pro-and-up.
        const denied = await checkAiAccess(auth.subscription, "Cover Letter", "writing", auth.user!.id);
        if (denied) return denied;

        if (!description || description.length < 50) {
            return withCors(NextResponse.json({ error: "Job description too short" }, { status: 400 }));
        }

        const existingJob = await findJobByUrl(user.id, jobUrl);
        if (!force && existingJob?.coverLetter?.trim()) {
            return withCors(NextResponse.json({
                success: true,
                reused: true,
                jobId: existingJob.id,
                coverLetter: existingJob.coverLetter,
                message: "Existing cover letter reused",
            }));
        }

        // Fetch user's primary profile
        const profiles = await db.master_profiles.findMany({
            where: { user_id: user.id },
            orderBy: { updated_at: "desc" },
        });

        const profile = profiles.find((p) => p.is_default) || profiles[0];

        if (!profile || !profile.parsed_data) {
            return withCors(NextResponse.json({ error: "No profile found" }, { status: 404 }));
        }

        const spent = await spendCredits(user.id, "writing");
        if (!spent.ok) return withCors(NextResponse.json({ error: "You're out of credits.", upgradeRequired: true, outOfCredits: true }, { status: 402 }));
        reservedFor = user.id;

        let data = profile.parsed_data as any;

        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch (e) {
                data = {};
            }
        }

        const result = await callBackend<{ response: string }>("/api/generate-cover-letter", {
            method: "POST", timeoutMs: 90000, headers: { "X-Client-Id": user.id },
            body: { jobDescription: `${jobTitle || ""} at ${company || ""}\n\n${description}`, masterProfile: data },
        });
        if (!result.ok) {
            await refundCredits(user.id, "writing", "extension cover letter generation failed");
            reservedFor = null;
            return withCors(NextResponse.json({ error: "Cover letter generation failed. Please try again.", creditCharged: false }, { status: 502 }));
        }
        const coverLetter = result.data?.response?.trim() || "";

        if (!coverLetter) {
            await refundCredits(user.id, "writing", "extension cover letter empty response");
            reservedFor = null;
            return withCors(NextResponse.json({ error: "Empty response from AI", creditCharged: false }, { status: 500 }));
        }

        // Save or update the job with cover letter
        let job = existingJob;

        if (job) {
            // Update existing job with cover letter
            job = await db.jobApplication.update({
                where: { id: job.id },
                data: { coverLetter },
            });
        } else {
            // Create new job with cover letter
            job = await db.jobApplication.create({
                data: {
                    userId: user.id,
                    jobTitle: jobTitle || "Untitled Position",
                    company: company || "Unknown Company",
                    jobUrl,
                    description: description.substring(0, 5000),
                    coverLetter,
                    source: "extension",
                    sourceUrl: jobUrl,
                    status: "SAVED",
                },
            });
        }

        return withCors(NextResponse.json({
            success: true,
            jobId: job.id,
            coverLetter,
            credits_remaining: spent.remaining,
            message: "Cover letter generated and saved",
        }));

    } catch (error) {
        if (reservedFor) await refundCredits(reservedFor, "writing", "extension cover letter failed");
        console.error("[COVER_LETTER]", error);
        return withCors(NextResponse.json({ error: "Internal Error" }, { status: 500 }));
    }
}
