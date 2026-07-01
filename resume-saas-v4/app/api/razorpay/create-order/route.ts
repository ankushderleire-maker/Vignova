import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        const user = await db.users.findUnique({ where: { email: session.user.email } });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        
        const backendUrl = process.env.AI_BACKEND_URL || "http://localhost:8000";
        const response = await fetch(`${backendUrl}/checkout/create-order`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ...body,
                user_id: user.id
            })
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (e) {
        console.error("Create order error:", e);
        return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }
}
