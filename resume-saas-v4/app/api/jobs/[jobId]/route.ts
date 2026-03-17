import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

// PATCH: Update Job Status OR Details (Company, Description, etc.)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) return new NextResponse("Unauthorized", { status: 401 });

    const { jobId } = await params;
    const body = await req.json();

    // --- THE FIX IS HERE ---
    // Destructure ALL possible fields from the body, not just status
    const { status, company, jobTitle, description, location, jobUrl } = body;

    const updatedJob = await db.jobApplication.update({
      where: {
        id: jobId,
        userId: (session?.user as any)?.id as string,
      },
      data: {
        // Only update the field if it exists in the request body
        // We use the spread syntax to conditionally add fields to the update object
        ...(status && { status }),
        ...(company && { company }),
        ...(jobTitle && { jobTitle }),
        ...(description !== undefined && { description }), // Allow empty strings
        ...(location !== undefined && { location }),
        ...(jobUrl !== undefined && { jobUrl }),
      },
    });

    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error("[JOB_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE: Remove a job
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) return new NextResponse("Unauthorized", { status: 401 });

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
    return new NextResponse("Internal Error", { status: 500 });
  }
}