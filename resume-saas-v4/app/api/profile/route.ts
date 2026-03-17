import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!(session?.user as any)?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Find the DEFAULT Master Profile for this user
    // First try to find the default profile, then fall back to any profile
    let profile = await db.master_profiles.findFirst({
      where: {
        user_id: (session?.user as any)?.id as string,
        is_default: true,
      },
    });

    // If no default profile, get the first one (for backwards compatibility)
    if (!profile) {
      profile = await db.master_profiles.findFirst({
        where: {
          user_id: (session?.user as any)?.id as string,
        },
        orderBy: {
          created_at: 'asc',
        },
      });
    }

    // If no profile exists yet, return empty object (not an error)
    if (!profile) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: profile.parsed_data });
  } catch (error) {
    console.error("[PROFILE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!(session?.user as any)?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json(); // This is the ResumeData object
    const userId = (session?.user as any)?.id as string;

    // Check if any profiles exist for this user  
    // First try to find the default profile
    let existingProfile = await db.master_profiles.findFirst({
      where: { user_id: userId, is_default: true },
    });

    // If no default, get any profile
    if (!existingProfile) {
      existingProfile = await db.master_profiles.findFirst({
        where: { user_id: userId },
      });
    }

    if (existingProfile) {
      // UPDATE existing profile
      await db.master_profiles.update({
        where: { id: existingProfile.id },
        data: {
          parsed_data: body, // Prisma handles JSON conversion automatically
        },
      });
    } else {
      // CREATE new profile
      await db.master_profiles.create({
        data: {
          user_id: userId,
          parsed_data: body,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PROFILE_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}