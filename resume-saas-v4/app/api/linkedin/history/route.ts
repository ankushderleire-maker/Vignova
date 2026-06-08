import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id;
        
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const latest = await db.linkedInAnalysis.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ result: latest || null });
    } catch (e) {
        console.error("Error fetching linkedin history:", e);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
