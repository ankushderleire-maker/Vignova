import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

// GET: Fetch saved resumes for a specific job
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.id) return new NextResponse("Unauthorized", { status: 401 });

        const { searchParams } = new URL(req.url);
        const jobId = searchParams.get("jobId");

        const whereClause: any = {
            userId: (session?.user as any)?.id as string,
        };
        if (jobId) {
            whereClause.jobId = jobId;
        }

        const resumes = await db.generatedResume.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            include: { job: { select: { company: true, jobTitle: true } } }
        });

        return NextResponse.json({ data: resumes });
    } catch (error) {
        console.error("[RESUMES_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// POST: Save a generated resume
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.id) return new NextResponse("Unauthorized", { status: 401 });

        const body = await req.json();
        const { jobId, content, resumeName } = body;

        if (!jobId || !content) {
            return new NextResponse("Job ID and Content are required", { status: 400 });
        }

        const resume = await db.generatedResume.create({
            data: {
                userId: (session?.user as any)?.id as string,
                jobId,
                content,
                name: resumeName || `Resume ${new Date().toLocaleString()}`,
            },
        });

        return NextResponse.json({ data: resume });
    } catch (error) {
        console.error("[RESUMES_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
