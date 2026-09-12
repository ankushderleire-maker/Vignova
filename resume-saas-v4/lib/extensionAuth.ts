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
        select: { id: true, email: true, full_name: true, extensionSettings: true, status: true },
    });

    if (!user) return { error: "User not found", status: 401 };
    if (user.status !== "ACTIVE") return { error: "This account is not active. Contact Vignova support.", status: 403 };

    // Check subscription and extension access
    const found = await db.subscriptions.findFirst({
        where: { user_id: user.id },
    });

    // A missing row used to 403 every extension route with "No subscription
    // found", which broke the free features too — the status dropdown, the
    // match score and the profile lookup all went dead for anyone whose row
    // had not been created. Treated as FREE instead; the paid routes check the
    // plan themselves via checkAiAccess.
    const expired = found?.expires_at && found.expires_at.getTime() <= Date.now();
    const subscription = found ? (expired ? { ...found, plan_type: "FREE", credits_remaining: 0,
        has_multi_profile: false, has_unlimited_resumes: false } : found) : {
        id: "",
        user_id: user.id,
        plan_type: "FREE",
        billing_cycle: "MONTHLY",
        credits_remaining: 0,
        credits_total: 0,
        has_extension_access: true,
        has_multi_profile: false,
        has_unlimited_resumes: false,
        starts_at: new Date(),
        expires_at: null,
        created_at: new Date(),
        updated_at: new Date(),
    };

    // Free accounts can use the extension. Every paid endpoint checks current entitlements.
    return {
        user,
        subscription,
        error: null,
        status: 200,
    };
}
