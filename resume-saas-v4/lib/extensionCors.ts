import { NextResponse } from "next/server";

/**
 * CORS headers for Extension API routes.
 * Browser extensions make cross-origin requests from LinkedIn.com / Indeed.com,
 * so we must allow those origins.
 */
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*", // Extensions send from chrome-extension:// origin
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
};

/**
 * Apply CORS headers to a NextResponse
 */
export function withCors(response: NextResponse): NextResponse {
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
}

/**
 * Handle preflight OPTIONS request
 */
export function handleCorsOptions(): NextResponse {
    return withCors(new NextResponse(null, { status: 204 }));
}
