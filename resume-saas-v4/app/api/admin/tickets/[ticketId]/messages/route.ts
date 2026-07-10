import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export async function POST(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
    try {
        const auth = await requireAdmin();
        if (auth.error) return auth.error;
        const adminId = auth.user.id;

        const resolvedParams = await params;
        const ticketId = resolvedParams.ticketId;

        const body = await req.json();
        const { message } = body;

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // Add message
        const newMessage = await prisma.ticketMessage.create({
            data: {
                ticketId,
                senderId: adminId,
                message,
                isAdmin: true
            }
        });

        // Update the updatedAt field and potentially change status to IN_PROGRESS if it was OPEN
        const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
        await prisma.supportTicket.update({
            where: { id: ticketId },
            data: { 
                updatedAt: new Date(),
                status: ticket?.status === 'OPEN' ? 'IN_PROGRESS' : undefined,
                hasUnreadReply: true
            }
        });

        return NextResponse.json(newMessage);
    } catch (error: any) {
        console.error("POST /api/admin/tickets/[ticketId]/messages error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
