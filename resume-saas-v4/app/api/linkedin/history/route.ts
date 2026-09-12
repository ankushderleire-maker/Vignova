import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { sanitizeLinkedInProfile } from "@/lib/linkedin-skills";
import { redactLinkedInAnalysis } from "@/lib/linkedin-redact";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id;
        
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const latest = await db.linkedInAnalysis.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        // Clean older saved analyses on read without requiring another paid rewrite.
        // Redacted as well: rows stored before the connect route began stripping
        // it still carry the provider's name in rawProfileData.source.
        return NextResponse.json({ result: latest ? redactLinkedInAnalysis({
            ...latest,
            rawProfileData: sanitizeLinkedInProfile(latest.rawProfileData),
            optimizedContent: sanitizeLinkedInProfile(latest.optimizedContent),
        }) : null });
    } catch (e) {
        console.error("Error fetching linkedin history:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
