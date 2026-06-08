import { NextResponse } from "next/server";
import { getExtensionUser } from "@/lib/extensionAuth";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";

export async function OPTIONS() {
    return handleCorsOptions();
}

export async function POST(req: Request) {
    try {
        const auth = await getExtensionUser(req);
        if (auth.error) {
            return withCors(NextResponse.json({ error: auth.error }, { status: auth.status }));
        }

        const body = await req.json();
        const AI_BACKEND_URL = process.env.AI_BACKEND_URL || "http://localhost:8000";

        const aiResponse = await fetch(`${AI_BACKEND_URL}/api/agent/plan-batch`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "x-api-key": process.env.INTERNAL_API_KEY || "vignova_internal_secret_key_123"
            },
            body: JSON.stringify(body),
        });

        if (!aiResponse.ok) {
            return withCors(NextResponse.json({ error: "AI backend failed" }, { status: 502 }));
        }

        const aiResult = await aiResponse.json();
        return withCors(NextResponse.json(aiResult));
    } catch (error) {
        console.error("[EXTENSION_PLAN_BATCH]", error);
        return withCors(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
    }
}
