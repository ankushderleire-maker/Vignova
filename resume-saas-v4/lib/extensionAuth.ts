import jwt from "jsonwebtoken";
import { db } from "@/lib/db";

// Use a separate secret for extension tokens (never share with NextAuth)
// CRITICAL: Must be set in .env — no insecure fallback
const TOKEN_EXPIRY = "24h";

function getExtensionSecret(): string {
    const secret = process.env.EXTENSION_JWT_SECRET;
    if (!secret) {
        throw new Error("EXTENSION_JWT_SECRET environment variable is required. Generate one with: openssl rand -base64 32");
    }
    return secret;
}

// ─── Token Payload ───
interface ExtensionTokenPayload {
    userId: string;
    email: string;
    type: "extension";
}

// ─── Generate Extension Token ───
export function generateExtensionToken(userId: string, email: string): string {
    return jwt.sign(
        { userId, email, type: "extension" } as ExtensionTokenPayload,
        getExtensionSecret(),
        { expiresIn: TOKEN_EXPIRY }
    );
}

// ─── Verify Extension Token ───
export function verifyExtensionToken(token: string): ExtensionTokenPayload | null {
    try {
        const decoded = jwt.verify(token, getExtensionSecret()) as ExtensionTokenPayload;
        if (decoded.type !== "extension") return null;
        return decoded;
    } catch (error) {
        return null; // Expired or invalid
    }
}

// ─── Extract Token from Authorization Header ───
export function extractBearerToken(req: Request): string | null {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    return authHeader.substring(7);
}

// ─── Full Auth Check: Verify Token + Check DB + Check Extension Access ───
export async function getExtensionUser(req: Request) {
    const token = extractBearerToken(req);
    if (!token) return { error: "Missing authorization token", status: 401 };

    const payload = verifyExtensionToken(token);
    if (!payload) return { error: "Invalid or expired token", status: 401 };

    // Fetch user from DB
    const user = await db.users.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, full_name: true, extensionSettings: true },
    });

    if (!user) return { error: "User not found", status: 401 };

    // Check subscription and extension access
    const subscription = await db.subscriptions.findFirst({
        where: { user_id: user.id },
    });

    if (!subscription) {
        return { error: "No subscription found", status: 403 };
    }

    // 3-tier extension access check
    let hasAccess = subscription.has_extension_access;

    if (!hasAccess) {
        // Check the plan_configs table
        const planConfig = await db.plan_configs.findUnique({
            where: { plan_type: subscription.plan_type },
        });
        if (planConfig?.has_extension_access) {
            hasAccess = true;
            await db.subscriptions.update({
                where: { id: subscription.id },
                data: { has_extension_access: true },
            });
        }
    }

    if (!hasAccess) {
        // Fallback: PRO and PREMIUM always get access
        if (subscription.plan_type === "PRO" || subscription.plan_type === "PREMIUM") {
            hasAccess = true;
            await db.subscriptions.update({
                where: { id: subscription.id },
                data: { has_extension_access: true },
            });
        }
    }

    // All users get extension access.
    // Premium feature gating is handled in the extension popup UI itself.

    return {
        user,
        subscription,
        error: null,
        status: 200,
    };
}
