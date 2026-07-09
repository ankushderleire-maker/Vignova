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

        // Get user ID from DB since session might just have email
        const user = await db.users.findUnique({ where: { email: session.user.email } });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        
        const backendUrl = process.env.AI_BACKEND_URL || "http://localhost:8000";
        const response = await fetch(`${backendUrl}/checkout/preview`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Shared internal secret — the backend is publicly reachable,
                // so it only trusts checkout calls that carry this key.
                "X-API-Key": process.env.INTERNAL_API_KEY || "",
            },
            body: JSON.stringify({
                ...body,
                user_id: user.id
            })
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (e) {
        console.error("Preview error:", e);
        return NextResponse.json({ error: "Failed to preview checkout" }, { status: 500 });
    }
}
