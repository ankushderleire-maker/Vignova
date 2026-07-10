import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const unreadTickets = await prisma.supportTicket.findMany({
            where: {
                userId: (session!.user as any).id,
                hasUnreadReply: true
            },
            orderBy: {
                updatedAt: 'desc',
            },
            select: {
                id: true,
                subject: true,
                updatedAt: true
            }
        });

        return NextResponse.json(unreadTickets);
    } catch (error: any) {
        console.error("GET /api/tickets/unread error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
