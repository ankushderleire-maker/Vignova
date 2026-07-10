import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const resolvedParams = await params;
        const ticketId = resolvedParams.ticketId;

        // Verify ownership
        const ticket = await prisma.supportTicket.findUnique({
            where: { id: ticketId }
        });

        if (!ticket || ticket.userId !== (session!.user as any).id) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        // Mark as read
        await prisma.supportTicket.update({
            where: { id: ticketId },
            data: { hasUnreadReply: false }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("POST /api/tickets/[ticketId]/read error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
