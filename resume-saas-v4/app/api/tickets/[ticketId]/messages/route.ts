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

        const body = await req.json();
        const { message } = body;

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // Verify ticket ownership
        const ticket = await prisma.supportTicket.findUnique({
            where: {
                id: ticketId,
                userId: (session!.user as any).id
            }
        });

        if (!ticket) {
            return NextResponse.json({ error: "Ticket not found or unauthorized" }, { status: 404 });
        }

        // Add message
        const newMessage = await prisma.ticketMessage.create({
            data: {
                ticketId,
                senderId: (session!.user as any).id,
                message,
                isAdmin: false
            }
        });

        // Optionally, we can also update the updatedAt field on the ticket here
        await prisma.supportTicket.update({
            where: { id: ticketId },
            data: { updatedAt: new Date(), status: ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? 'OPEN' : ticket.status }
        });

        return NextResponse.json(newMessage);
    } catch (error: any) {
        console.error("POST /api/tickets/[ticketId]/messages error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
