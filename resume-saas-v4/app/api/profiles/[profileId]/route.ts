import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

/**
 * GET /api/profiles/[profileId]
 * Fetch a specific profile with full data
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ profileId: string }> }
) {
    try {
        const { profileId } = await params;
        const session = await getServerSession(authOptions);

        if (!(session?.user as any)?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const profile = await db.master_profiles.findFirst({
            where: {
                id: profileId,
                user_id: (session?.user as any)?.id as string, // Ensure user owns this profile
            },
        });

        if (!profile) {
            return new NextResponse("Profile not found", { status: 404 });
        }

        return NextResponse.json({ profile });
    } catch (error) {
        console.error("[PROFILE_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

/**
 * PATCH /api/profiles/[profileId]
 * Update profile name or data
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ profileId: string }> }
) {
    try {
        const { profileId } = await params;
        const session = await getServerSession(authOptions);

        if (!(session?.user as any)?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userId = (session?.user as any)?.id as string;
        const body = await req.json();
        const { name, parsed_data } = body;

        // Verify profile exists and belongs to user
        const existingProfile = await db.master_profiles.findFirst({
            where: {
                id: profileId,
                user_id: userId,
            },
        });

        if (!existingProfile) {
            return new NextResponse("Profile not found", { status: 404 });
        }

        // If changing name, check for duplicates
        if (name && name !== existingProfile.name) {
            const duplicateName = await db.master_profiles.findFirst({
                where: {
                    user_id: userId,
                    name: name,
                    id: { not: profileId },
                },
            });

            if (duplicateName) {
                return NextResponse.json(
                    { error: "A profile with this name already exists" },
                    { status: 409 }
                );
            }
        }

        // Update the profile
        const updatedProfile = await db.master_profiles.update({
            where: { id: profileId },
            data: {
                ...(name && { name }),
                ...(parsed_data && { parsed_data }),
            },
        });

        return NextResponse.json({ profile: updatedProfile });
    } catch (error) {
        console.error("[PROFILE_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

/**
 * DELETE /api/profiles/[profileId]
 * Delete a profile (prevent deleting last profile)
 */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ profileId: string }> }
) {
    try {
        const { profileId } = await params;
        const session = await getServerSession(authOptions);

        if (!(session?.user as any)?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userId = (session?.user as any)?.id as string;

        // Verify profile exists and belongs to user
        const profile = await db.master_profiles.findFirst({
            where: {
                id: profileId,
                user_id: userId,
            },
        });

        if (!profile) {
            return new NextResponse("Profile not found", { status: 404 });
        }

        // Check if this is the last profile
        const profileCount = await db.master_profiles.count({
            where: { user_id: userId },
        });

        if (profileCount <= 1) {
            return NextResponse.json(
                { error: "Cannot delete your only profile" },
                { status: 400 }
            );
        }

        // If deleting the default profile, set another as default
        if (profile.is_default) {
            const nextProfile = await db.master_profiles.findFirst({
                where: {
                    user_id: userId,
                    id: { not: profileId },
                },
                orderBy: { created_at: 'asc' },
            });

            if (nextProfile) {
                await db.master_profiles.update({
                    where: { id: nextProfile.id },
                    data: { is_default: true },
                });
            }
        }

        // Delete the profile
        await db.master_profiles.delete({
            where: { id: profileId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[PROFILE_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
