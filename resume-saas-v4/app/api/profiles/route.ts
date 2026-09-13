import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { getUserSubscription } from "@/lib/subscription";
import { UNLIMITED, enforcedPlanLimits } from "@/lib/planLimits";

/**
 * GET /api/profiles
 * Fetch all profiles for the logged-in user
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!(session?.user as any)?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const profiles = await db.master_profiles.findMany({
            where: {
                user_id: (session?.user as any)?.id as string,
            },
            select: {
                id: true,
                name: true,
                is_default: true,
                created_at: true,
                updated_at: true,
            },
            orderBy: [
                { is_default: 'desc' }, // Default profile first
                { created_at: 'asc' },  // Then by creation date
            ],
        });

        return NextResponse.json({ profiles });
    } catch (error) {
        console.error("[PROFILES_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

/**
 * POST /api/profiles
 * Create a new profile (with Pro restriction)
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!(session?.user as any)?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session?.user as any)?.id as string;
        const body = await req.json();
        const { name, parsed_data } = body;

        if (!name || typeof name !== 'string') {
            return NextResponse.json(
                { error: "Profile name is required" },
                { status: 400 }
            );
        }

        // Check subscription and existing profile count
        const subscription = await getUserSubscription(userId);
        const existingProfiles = await db.master_profiles.count({
            where: { user_id: userId },
        });

        // The cap is the plan's max_profiles, which the pricing and usage pages
        // both show. This used to allow one profile on Free and unlimited on
        // any paid plan, whatever the plan was configured to include.
        const limits = await enforcedPlanLimits(subscription?.plan_type);
        if (limits.max_profiles !== UNLIMITED && existingProfiles >= limits.max_profiles) {
            const plan = limits.plan_type.charAt(0) + limits.plan_type.slice(1).toLowerCase();
            const cap = limits.max_profiles;
            return NextResponse.json(
                {
                    error: "Profile limit reached",
                    message: `Your ${plan} plan includes ${cap} master profile${cap === 1 ? "" : "s"}. Delete one or upgrade for more.`,
                    upgrade_required: true,
                },
                { status: 403 }
            );
        }

        // Check for duplicate name
        const duplicateName = await db.master_profiles.findFirst({
            where: {
                user_id: userId,
                name: name,
            },
        });

        if (duplicateName) {
            return NextResponse.json(
                { error: "A profile with this name already exists" },
                { status: 409 }
            );
        }

        // Create the profile
        const isFirstProfile = existingProfiles === 0;
        const newProfile = await db.master_profiles.create({
            data: {
                user_id: userId,
                name: name,
                parsed_data: parsed_data || {},
                is_default: isFirstProfile, // First profile is default
            },
        });

        return NextResponse.json({ profile: newProfile }, { status: 201 });
    } catch (error) {
        console.error("[PROFILES_POST]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
