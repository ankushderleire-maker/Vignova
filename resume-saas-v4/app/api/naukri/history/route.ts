import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

/**
 * GET /api/naukri/history[?id=]
 *
 * The analysis the extension just opened the dashboard on, when an id is given
 * and it belongs to this user, otherwise the user's newest one, plus the
 * user's recent scans to switch between.
 */
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const id = new URL(req.url).searchParams.get("id");
        const requested = id ? await db.naukriAnalysis.findFirst({ where: { id, userId } }) : null;
        const result = requested ?? (await db.naukriAnalysis.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }));
        // Earlier scans stay one click away, so a saved optimization is never
        // hidden behind a newer scan.
        const rows = await db.naukriAnalysis.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: { id: true, createdAt: true, overallScore: true, optimizedContent: true },
        });
        const analyses = rows.map(({ optimizedContent, ...row }) => ({ ...row, optimized: optimizedContent !== null }));
        return NextResponse.json({ result, analyses });
    } catch (error) {
        console.error("[NAUKRI_HISTORY]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
