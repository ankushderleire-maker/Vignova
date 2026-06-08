import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

// GET /api/user/onboarding — Check if user has completed onboarding
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id;
        
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = await db.users.findUnique({
            where: { id: userId },
            select: { onboarding_done: true },
        });

        const isDone = user?.onboarding_done ?? false;

        // If tour is active, ensure there's dummy data so the UI isn't empty
        if (!isDone) {
            const jobCount = await db.jobApplication.count({ where: { userId } });
            if (jobCount === 0) {
                await db.jobApplication.create({
                    data: {
                        userId,
                        company: "Vignova (Sample Data)",
                        jobTitle: "Product Designer",
                        description: "This is a sample job description to help you explore the Job Tracker and Resume Generator. It will be removed automatically once you finish the tour.",
                        status: "SAVED"
                    }
                });
            }

            const profileCount = await db.master_profiles.count({ where: { user_id: userId } });
            if (profileCount === 0) {
                await db.master_profiles.create({
                    data: {
                        user_id: userId,
                        name: "Main Profile",
                        is_default: true,
                    }
                });
            }
        }

        return NextResponse.json({ onboarding_done: isDone });
    } catch (error) {
        console.error("[ONBOARDING_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// POST /api/user/onboarding — Mark onboarding as completed
export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // 1. Mark as done
        await db.users.update({
            where: { id: userId },
            data: { onboarding_done: true },
        });

        // 2. Clean up dummy data
        await db.jobApplication.deleteMany({
            where: { 
                userId, 
                company: "Vignova (Sample Data)" 
            }
        });

        return NextResponse.json({ onboarding_done: true });
    } catch (error) {
        console.error("[ONBOARDING_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
