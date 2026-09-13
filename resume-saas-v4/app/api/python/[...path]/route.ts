import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const maxDuration = 300; // 5 minutes just in case

/** Backend paths the browser may reach through this proxy. See the check below. */
const ALLOWED_PATHS = new Set(["calculate-ats", "saved-jds"]);

export async function POST(req: NextRequest, context: any) {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // App router params might be passed in context.params
        const params = await context.params;
        const pathArray = params?.path || [];
        const path = pathArray.join("/");

        // Only the free, algorithmic endpoints the dashboard still calls go
        // through here. This used to forward any non-admin path, so anyone
        // signed in could reach /api/python/generate-tailored-resume (or the
        // cover letter, email, interview and ATS-insight generators) directly
        // and skip the route that checks their plan and charges a credit.
        // Segments are restricted to plain characters as well: a ".." segment
        // is resolved by the URL parser and would walk out of the allowlist.
        const firstSegment = String(pathArray[0] || "").toLowerCase();
        const plainSegments = pathArray.every((segment: unknown) => /^[A-Za-z0-9_-]+$/.test(String(segment)));
        if (!ALLOWED_PATHS.has(firstSegment) || !plainSegments) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const url = new URL(req.url);
        const AI_BACKEND_URL = process.env.AI_BACKEND_URL || "http://localhost:8000";
        const backendUrl = `${AI_BACKEND_URL}/api/${path}${url.search}`;
        
        // Remove hostile headers
        const headers = new Headers(req.headers);
        headers.delete("host");
        headers.delete("connection");
        
        const fetchOptions: RequestInit = {
            method: req.method,
            headers: headers,
        };

        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            fetchOptions.body = req.body as any;
            // @ts-ignore
            fetchOptions.duplex = "half";
        }
        
        const response = await fetch(backendUrl, fetchOptions);

        const data = await response.arrayBuffer();
        
        // Return response from backend
        return new Response(data, {
            status: response.status,
            headers: {
                "Content-Type": response.headers.get("content-type") || "application/json",
            },
        });
    } catch (error) {
        console.error("Dynamic Proxy Error:", error);
        return new Response(JSON.stringify({ error: "Failed to proxy to backend" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

export const GET = POST;
export const PUT = POST;
export const DELETE = POST;
