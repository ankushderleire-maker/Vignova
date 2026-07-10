import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const resolvedParams = await params;
        const id = resolvedParams.id;

        const body = await req.json();
        const { aiReport, atsResult } = body;

        // Verify ownership
        const existing = await prisma.atsScoreReport.findUnique({
            where: { id }
        });

        if (!existing || existing.userId !== (session!.user as any).id) {
            return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
        }

        const dataToUpdate: any = {};
        if (aiReport !== undefined) dataToUpdate.aiReport = aiReport;
        if (atsResult !== undefined) dataToUpdate.atsResult = atsResult;

        const report = await prisma.atsScoreReport.update({
            where: { id },
            data: dataToUpdate
        });

        return NextResponse.json(report);
    } catch (error: any) {
        console.error("PATCH /api/ats-reports/[id] error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
