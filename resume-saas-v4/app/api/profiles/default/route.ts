import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

/**
 * POST /api/profiles/default
 * Set a profile as the default
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!(session?.user as any)?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userId = (session?.user as any)?.id as string;
        const body = await req.json();
        const { profileId } = body;

        if (!profileId) {
            return NextResponse.json(
                { error: "profileId is required" },
                { status: 400 }
            );
        }

        // Verify the profile exists and belongs to user
        const profile = await db.master_profiles.findFirst({
            where: {
                id: profileId,
                user_id: userId,
            },
        });

        if (!profile) {
            return new NextResponse("Profile not found", { status: 404 });
        }

        // Update all profiles: set is_default = false
        await db.master_profiles.updateMany({
            where: { user_id: userId },
            data: { is_default: false },
        });

        // Set the specified profile as default
        await db.master_profiles.update({
            where: { id: profileId },
            data: { is_default: true },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[SET_DEFAULT_PROFILE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
