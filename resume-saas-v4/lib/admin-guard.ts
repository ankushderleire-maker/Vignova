import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

// Canonical value sets — every admin route validates against these instead
// of trusting request bodies.
export const VALID_ROLES = ["USER", "ADMIN"] as const;
export const VALID_PLANS = ["FREE", "PRO", "PREMIUM"] as const;
export const VALID_USER_STATUSES = ["ACTIVE", "SUSPENDED"] as const;
export const MAX_CREDITS = 100000;

export type AdminUser = {
    id: string;
    role: string;
    email: string;
    full_name: string | null;
};

/**
 * Validates that the current session belongs to an ACTIVE ADMIN user.
 * Returns the user object if valid, or a NextResponse error if not.
 */
export async function requireAdmin(): Promise<
    { user: AdminUser; error?: undefined } | { user?: undefined; error: NextResponse }
> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    const user = await db.users.findUnique({
        where: { email: session.user.email },
        select: { id: true, role: true, email: true, full_name: true, status: true },
    });

    if (!user || user.role !== "ADMIN") {
        return { error: NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 }) };
    }

    if (user.status === "SUSPENDED") {
        return { error: NextResponse.json({ error: "Forbidden: Account suspended" }, { status: 403 }) };
    }

    return { user: { id: user.id, role: user.role, email: user.email, full_name: user.full_name } };
}

/**
 * Best-effort client IP from proxy headers (nginx sits in front in prod).
 */
export function requestIp(req?: Request): string | null {
    if (!req) return null;
    const fwd = req.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return req.headers.get("x-real-ip");
}

/**
 * Append an entry to the admin audit trail.
 *
 * Fail-open by design: auditing must never break the admin action itself
 * (e.g. if migration 006 hasn't been applied yet), so errors are logged
 * and swallowed.
 */
export async function logAdminAction(opts: {
    admin: AdminUser;
    action: string;
    targetType?: string;
    targetId?: string;
    details?: Record<string, unknown>;
    req?: Request;
}): Promise<void> {
    try {
        await db.$executeRawUnsafe(
            `INSERT INTO admin_audit_logs
                 (admin_id, admin_email, action, target_type, target_id, details, ip)
             VALUES ($1::uuid, $2::text, $3::text, $4::text, $5::text, $6::jsonb, $7::text)`,
            opts.admin.id,
            opts.admin.email,
            opts.action,
            opts.targetType || null,
            opts.targetId || null,
            opts.details ? JSON.stringify(opts.details) : null,
            requestIp(opts.req)
        );
    } catch (err) {
        console.error("[ADMIN_AUDIT_LOG] failed to record action", opts.action, err);
    }
}
