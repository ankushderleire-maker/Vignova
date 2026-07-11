import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// POST: Dismiss a notification for the current user
export async function POST(req: NextRequest, { params }: { params: Promise<{ notificationId: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const resolvedParams = await params;
        const notificationId = resolvedParams.notificationId;
        const userId = (session!.user as any).id;

        // Upsert to prevent duplicates
        await prisma.userNotificationDismissal.upsert({
            where: {
                userId_notificationId: {
                    userId,
                    notificationId
                }
            },
            create: {
                userId,
                notificationId,
            },
            update: {}
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("POST /api/notifications/[notificationId]/dismiss error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
