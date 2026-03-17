import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = await db.users.findUnique({
            where: { id: (session?.user as any)?.id as string },
            select: { extensionSettings: true },
        });

        // Default empty object if null
        return NextResponse.json(user?.extensionSettings || {});
    } catch (error) {
        console.error("[EXTENSION_SETTINGS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { mode, templateId, templateIds } = body;

        // Validation - ensure valid structure
        const settings = {
            mode: mode || "random", // "specific" | "random" | "curated"
            templateId: templateId || "classic",
            templateIds: Array.isArray(templateIds) ? templateIds : [],
        };

        const user = await db.users.update({
            where: { id: (session?.user as any)?.id as string },
            data: { extensionSettings: settings },
            select: { extensionSettings: true },
        });

        return NextResponse.json(user.extensionSettings);
    } catch (error) {
        console.error("[EXTENSION_SETTINGS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
