import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { country } = await req.json();

        if (!country || country.length !== 2) {
            return NextResponse.json({ error: "Valid country code required" }, { status: 400 });
        }

        await db.users.update({
            where: { email: session.user.email },
            data: { country }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[COMPLETE_PROFILE]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
