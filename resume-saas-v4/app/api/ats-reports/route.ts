import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const jobId = searchParams.get("jobId");

        // Without a jobId this returns the user's most recent reports across
        // every job, which is what the dashboard needs. Capped, and the heavy
        // resumeText column is left out.
        const reports = await prisma.atsScoreReport.findMany({
            where: {
                userId: (session!.user as any).id,
                ...(jobId ? { jobId } : {}),
            },
            orderBy: {
                createdAt: 'desc',
            },
            ...(jobId
                ? {}
                : {
                    take: 20,
                    select: {
                        id: true,
                        jobId: true,
                        resumeId: true,
                        atsResult: true,
                        createdAt: true,
                        job: { select: { jobTitle: true, company: true } },
                    },
                }),
        });

        return NextResponse.json(reports);
    } catch (error: any) {
        console.error("GET /api/ats-reports error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { jobId, resumeId, resumeText, atsResult, aiReport } = body;

        if (!jobId || !atsResult) {
            return NextResponse.json({ error: "Job ID and ATS Result are required" }, { status: 400 });
        }

        const report = await prisma.atsScoreReport.create({
            data: {
                userId: (session!.user as any).id,
                jobId,
                resumeId: resumeId || null,
                resumeText: resumeText || null,
                atsResult,
                aiReport: aiReport || null,
            },
        });

        return NextResponse.json(report);
    } catch (error: any) {
        console.error("POST /api/ats-reports error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
