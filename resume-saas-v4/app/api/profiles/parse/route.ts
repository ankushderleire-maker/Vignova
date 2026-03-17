import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file");

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const AI_BACKEND_URL = process.env.AI_BACKEND_URL || "http://localhost:8000";
        const backendFormData = new FormData();
        // Forward the exact file from the user
        backendFormData.append("file", file);

        const response = await fetch(`${AI_BACKEND_URL}/api/parse-resume`, {
            method: "POST",
            body: backendFormData,
        });

        if (!response.ok) {
            const errData = await response.text();
            console.error("AI backend error:", errData);
            return NextResponse.json({ error: "Failed to parse resume from AI backend" }, { status: response.status });
        }

        const result = await response.json();
        return NextResponse.json(result);
    } catch (error) {
        console.error("Parse proxy error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
