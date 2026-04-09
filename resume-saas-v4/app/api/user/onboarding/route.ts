import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

// GET /api/user/onboarding — Check if user has completed onboarding
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = await db.users.findUnique({
            where: { id: (session?.user as any)?.id as string },
            select: { onboarding_done: true },
        });

        return NextResponse.json({ onboarding_done: user?.onboarding_done ?? false });
    } catch (error) {
        console.error("[ONBOARDING_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// POST /api/user/onboarding — Mark onboarding as completed
export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        await db.users.update({
            where: { id: (session?.user as any)?.id as string },
            data: { onboarding_done: true },
        });

        return NextResponse.json({ onboarding_done: true });
    } catch (error) {
        console.error("[ONBOARDING_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
