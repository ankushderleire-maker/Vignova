import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

// PUT: Update an existing resume
export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as any).id) return new NextResponse("Unauthorized", { status: 401 });

        const userId = (session.user as any).id;

        const body = await req.json();
        const { content, name, masterProfileName } = body;

        // Verify ownership
        // Cast db to any because generated types might be out of sync
        const existingResume = await (db as any).generatedResume.findUnique({
            where: { id: params.id },
        });

        if (!existingResume) return new NextResponse("Not Found", { status: 404 });
        if (existingResume.userId !== userId) return new NextResponse("Unauthorized", { status: 403 });

        // Update
        const updatedResume = await (db as any).generatedResume.update({
            where: { id: params.id },
            data: {
                content,
                name: name || existingResume.name,
                ...(masterProfileName && { extensionData: { masterProfileName } }),
            },
        });

        return NextResponse.json({ data: updatedResume });
    } catch (error) {
        console.error("[RESUME_PUT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// DELETE: Delete a resume
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as any).id) return new NextResponse("Unauthorized", { status: 401 });

        const userId = (session.user as any).id;

        // Verify ownership
        const existingResume = await (db as any).generatedResume.findUnique({
            where: { id: params.id },
        });

        if (!existingResume) return new NextResponse("Not Found", { status: 404 });
        if (existingResume.userId !== userId) return new NextResponse("Unauthorized", { status: 403 });

        await (db as any).generatedResume.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[RESUME_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
