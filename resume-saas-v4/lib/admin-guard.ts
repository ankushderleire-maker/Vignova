import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

/**
 * Validates that the current session belongs to an ADMIN user.
 * Returns the user object if valid, or a NextResponse error if not.
 */
export async function requireAdmin() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    const user = await db.users.findUnique({
        where: { email: session.user.email },
        select: { id: true, role: true, email: true, full_name: true },
    });

    if (!user || user.role !== "ADMIN") {
        return { error: NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 }) };
    }

    return { user };
}
