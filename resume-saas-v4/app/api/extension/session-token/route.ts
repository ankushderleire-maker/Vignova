import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { generateExtensionToken } from "@/lib/extensionAuth";

// This route authenticates via the NextAuth *cookie* and returns a 24h
// extension token, so it MUST NOT reflect arbitrary origins with credentials —
// otherwise any website the logged-in user visits could silently read their
// token. Only the browser extension (chrome-extension:// / moz-extension://)
// and our own app origin are allowed to make credentialed calls.
function isAllowedOrigin(origin: string | null): boolean {
    if (!origin) return false;
    if (origin.startsWith("chrome-extension://") || origin.startsWith("moz-extension://")) return true;
    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
    return !!appUrl && origin === appUrl.replace(/\/$/, "");
}

function getCorsHeaders(req: Request) {
    const origin = req.headers.get("origin");
    const headers: Record<string, string> = {
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Vary": "Origin",
    };
    if (isAllowedOrigin(origin)) {
        headers["Access-Control-Allow-Origin"] = origin as string;
        headers["Access-Control-Allow-Credentials"] = "true";
    }
    return headers;
}

// CORS preflight
export async function OPTIONS(req: Request) {
    return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

/**
 * GET /api/extension/session-token
 * Validates the user's web session cookie via NextAuth and returns an extension token.
 * Chrome extensions call this with `{ credentials: "include" }` to be automatically logged in.
 */
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: "Unauthorized. Please log in on the website." },
                { status: 401, headers: getCorsHeaders(req) }
            );
        }

        // We know the session is valid, find the user in our DB
        const user = await db.users.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found in database." },
                { status: 404, headers: getCorsHeaders(req) }
            );
        }

        // Generate the token!
        const token = generateExtensionToken(user.id, user.email);

        return NextResponse.json({
            success: true,
            token,
            user: {
                name: user.full_name,
                email: user.email,
            },
        }, { headers: getCorsHeaders(req) });

    } catch (error) {
        console.error("[EXTENSION_SESSION_TOKEN]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500, headers: getCorsHeaders(req) }
        );
    }
}
