import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { queueJdFormat } from "@/lib/jdFormatQueue";

// PATCH: Update Job Status OR Details (Company, Description, etc.)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { jobId } = await params;
    const body = await req.json();
    const { status, company, jobTitle, description, location, jobUrl, coverLetter, interviewAt, deadlineAt } = body;

    const updatedJob = await db.jobApplication.update({
      where: {
        id: jobId,
        userId: (session?.user as any)?.id as string,
      },
      data: {
        ...(status && { status }),
        ...(company && { company }),
        ...(jobTitle && { jobTitle }),
        ...(description !== undefined && { description }),
        ...(location !== undefined && { location }),
        ...(jobUrl !== undefined && { jobUrl }),
        ...(coverLetter !== undefined && { coverLetter }),
        // Sent as an ISO string or null; null clears the date.
        ...(interviewAt !== undefined && { interviewAt: interviewAt ? new Date(interviewAt) : null }),
        ...(deadlineAt !== undefined && { deadlineAt: deadlineAt ? new Date(deadlineAt) : null }),
      },
    });

    // Only re-format when the description itself changed — a status flip
    // (e.g. SAVED -> TAILORING) must not spend a call.
    if (description !== undefined) {
      queueJdFormat(updatedJob.id, updatedJob.description);
    }

    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error("[JOB_PATCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// DELETE: Remove a job
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { jobId } = await params;

    await db.jobApplication.delete({
      where: {
        id: jobId,
        userId: (session?.user as any)?.id as string,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[JOB_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}