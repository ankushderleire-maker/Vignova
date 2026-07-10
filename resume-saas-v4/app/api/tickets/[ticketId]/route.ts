import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const resolvedParams = await params;
        const ticketId = resolvedParams.ticketId;

        const ticket = await prisma.supportTicket.findUnique({
            where: {
                id: ticketId,
                userId: (session!.user as any).id
            },
            include: {
                messages: {
                    orderBy: {
                        createdAt: 'asc'
                    },
                    include: {
                        sender: {
                            select: {
                                full_name: true,
                                email: true
                            }
                        }
                    }
                }
            }
        });

        if (!ticket) {
            return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
        }

        return NextResponse.json(ticket);
    } catch (error: any) {
        console.error("GET /api/tickets/[ticketId] error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
