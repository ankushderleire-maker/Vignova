import { NextRequest } from "next/server";

export const maxDuration = 300; // 5 minutes just in case

export async function POST(req: NextRequest, context: any) {
    try {
        // App router params might be passed in context.params
        const params = await context.params;
        const pathArray = params?.path || [];
        const path = pathArray.join("/");
        
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
