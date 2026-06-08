import { NextRequest, NextResponse } from "next/server";
import { callBackend } from "@/lib/career-ops";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    const title = searchParams.get("title")?.trim() || searchParams.get("search")?.trim() || "";
    const location = searchParams.get("location")?.trim() || "";
    const experience = searchParams.get("experience")?.trim() || "";
    const days = searchParams.get("days")?.trim() || "";
    const page = searchParams.get("page")?.trim() || "1";
    const limit = searchParams.get("limit")?.trim() || "20";

    const result = await callBackend("/jobs", {
        method: "GET",
        query: {
            title,
            location,
            experience,
            days,
            page,
            limit,
        },
        timeoutMs: 15000,
    });

    if (!result.ok || !result.data) {
        return NextResponse.json(
            { error: result.error || "Failed to fetch jobs" },
            { status: result.status || 500 }
        );
    }

    return NextResponse.json(result.data);
}
