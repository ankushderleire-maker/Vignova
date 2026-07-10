import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export async function GET(req: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (auth.error) return auth.error;

        const tickets = await prisma.supportTicket.findMany({
            orderBy: {
                updatedAt: 'desc',
            },
            include: {
                user: {
                    select: {
                        full_name: true,
                        email: true,
                    }
                },
                _count: {
                    select: { messages: true }
                }
            }
        });

        return NextResponse.json(tickets);
    } catch (error: any) {
        console.error("GET /api/admin/tickets error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
