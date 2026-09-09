import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { queueJdFormat } from "@/lib/jdFormatQueue";

export const dynamic = 'force-dynamic';

// GET: Fetch all jobs for the logged-in user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const jobs = await db.jobApplication.findMany({
      where: { userId: (session?.user as any)?.id as string },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: jobs });
  } catch (error) {
    console.error("[JOBS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// POST: Add a new job manually
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { company, jobTitle, description, jobUrl, location } = body;

    if (!company || !jobTitle) {
      return NextResponse.json({ error: "Company and Title are required" }, { status: 400 });
    }

    const job = await db.jobApplication.create({
      data: {
        userId: (session?.user as any)?.id as string,
        company,
        jobTitle,
        description,
        jobUrl,
        location,
        status: "SAVED", // Default column
      },
    });

    // Pasted descriptions get the same treatment as scraped ones.
    queueJdFormat(job.id, description);

    return NextResponse.json({ data: job });
  } catch (error) {
    console.error("[JOBS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}