import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

// GET: List all admin notifications
export async function GET(req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth.error) return auth.error;

        const notifications = await prisma.adminNotification.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                _count: { select: { dismissals: true } }
            }
        });

        return NextResponse.json(notifications);
    } catch (error: any) {
        console.error("GET /api/admin/notifications error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create a new push notification
export async function POST(req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth.error) return auth.error;

        const body = await req.json();
        const { title, message, targetType, targetFilter } = body;

        if (!title || !message) {
            return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
        }

        const notification = await prisma.adminNotification.create({
            data: {
                title,
                message,
                targetType: targetType || "ALL",
                targetFilter: targetFilter || null,
            }
        });

        return NextResponse.json(notification);
    } catch (error: any) {
        console.error("POST /api/admin/notifications error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
