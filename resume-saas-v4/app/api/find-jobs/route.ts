import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/find-jobs?search=&location=&page=1&limit=20
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search")?.trim() || "";
        const location = searchParams.get("location")?.trim() || "";
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};

        if (search) {
            where.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { company: { contains: search, mode: "insensitive" } },
            ];
        }

        if (location) {
            where.location = { contains: location, mode: "insensitive" };
        }

        // Query jobs + total in parallel
        const [jobs, total] = await Promise.all([
            db.jobs.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    company: true,
                    location: true,
                    description: true,
                    apply_url: true,
                    source: true,
                    date_posted: true,
                },
                orderBy: { date_posted: "desc" },
                skip,
                take: limit,
            }),
            db.jobs.count({ where }),
        ]);

        return NextResponse.json({
            jobs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("[FIND_JOBS_GET]", error);
        return NextResponse.json(
            { error: "Failed to fetch jobs" },
            { status: 500 }
        );
    }
}
