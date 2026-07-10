import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export async function GET(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
    try {
        const auth = await requireAdmin();
        if (auth.error) return auth.error;

        const resolvedParams = await params;
        const ticketId = resolvedParams.ticketId;

        const ticket = await prisma.supportTicket.findUnique({
            where: {
                id: ticketId,
            },
            include: {
                user: {
                    select: {
                        full_name: true,
                        email: true
                    }
                },
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
        console.error("GET /api/admin/tickets/[ticketId] error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
    try {
        const auth = await requireAdmin();
        if (auth.error) return auth.error;

        const resolvedParams = await params;
        const ticketId = resolvedParams.ticketId;

        const body = await req.json();
        const { status, priority } = body;

        const dataToUpdate: any = {};
        if (status) dataToUpdate.status = status;
        if (priority) dataToUpdate.priority = priority;
        dataToUpdate.updatedAt = new Date();

        const ticket = await prisma.supportTicket.update({
            where: { id: ticketId },
            data: dataToUpdate
        });

        return NextResponse.json(ticket);
    } catch (error: any) {
        console.error("PATCH /api/admin/tickets/[ticketId] error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
