import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET: Fetch notifications for the current user (not dismissed)
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = (session!.user as any).id;

        // Get user's subscription to know their plan type
        const subscription = await prisma.subscriptions.findUnique({
            where: { user_id: userId },
            select: { plan_type: true }
        });
        const userPlan = subscription?.plan_type || "FREE";

        // Get IDs of notifications the user has already dismissed
        const dismissedIds = await prisma.userNotificationDismissal.findMany({
            where: { userId },
            select: { notificationId: true }
        });
        const dismissedSet = new Set(dismissedIds.map(d => d.notificationId));

        // Get all notifications that target this user
        const allNotifications = await prisma.adminNotification.findMany({
            orderBy: { createdAt: "desc" },
            take: 50
        });

        // Filter to only relevant notifications
        const userNotifications = allNotifications.filter(n => {
            // Already dismissed
            if (dismissedSet.has(n.id)) return false;

            if (n.targetType === "ALL") return true;
            if (n.targetType === "PLAN" && n.targetFilter) {
                return n.targetFilter.toUpperCase() === userPlan.toUpperCase();
            }
            if (n.targetType === "SPECIFIC" && n.targetFilter) {
                const targetIds = n.targetFilter.split(",").map(s => s.trim());
                return targetIds.includes(userId);
            }
            return true;
        });

        return NextResponse.json(userNotifications);
    } catch (error: any) {
        console.error("GET /api/notifications error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
