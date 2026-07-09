import { NextResponse } from "next/server";
import {
    requireAdmin,
    logAdminAction,
    VALID_ROLES,
    VALID_PLANS,
    VALID_USER_STATUSES,
    MAX_CREDITS,
} from "@/lib/admin-guard";
import { db } from "@/lib/db";

interface RouteParams {
    params: Promise<{ userId: string }>;
}

// GET single user detail
export async function GET(req: Request, { params }: RouteParams) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { userId } = await params;

    try {
        const user = await db.users.findUnique({
            where: { id: userId },
            include: {
                subscriptions: true,
                master_profiles: {
                    select: { id: true, name: true, is_default: true, created_at: true },
                },
                generated_resumes: {
                    select: { id: true, name: true, source: true, createdAt: true },
                    orderBy: { createdAt: "desc" },
                    take: 20,
                },
                job_applications: {
                    select: {
                        id: true,
                        company: true,
                        jobTitle: true,
                        status: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: "desc" },
                    take: 20,
                },
                payments: {
                    orderBy: { createdAt: "desc" },
                    take: 20,
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
            status: user.status,
            country: user.country,
            createdAt: user.created_at,
            subscription: user.subscriptions || null,
            profiles: user.master_profiles,
            resumes: user.generated_resumes,
            jobs: user.job_applications,
            payments: user.payments,
        });
    } catch (error) {
        console.error("[ADMIN_USER_GET]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH - Update user details (role / status / plan / credits)
export async function PATCH(req: Request, { params }: RouteParams) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { userId } = await params;

    try {
        const body = await req.json();
        const { role, status, plan_type, credits_remaining } = body;

        // ── Validate everything before touching the DB ──
        if (role !== undefined && !VALID_ROLES.includes(role)) {
            return NextResponse.json(
                { error: `role must be one of: ${VALID_ROLES.join(", ")}` },
                { status: 400 }
            );
        }
        if (status !== undefined && !VALID_USER_STATUSES.includes(status)) {
            return NextResponse.json(
                { error: `status must be one of: ${VALID_USER_STATUSES.join(", ")}` },
                { status: 400 }
            );
        }
        if (plan_type !== undefined && !VALID_PLANS.includes(plan_type)) {
            return NextResponse.json(
                { error: `plan_type must be one of: ${VALID_PLANS.join(", ")}` },
                { status: 400 }
            );
        }
        let credits: number | undefined;
        if (credits_remaining !== undefined) {
            credits = Number(credits_remaining);
            if (!Number.isInteger(credits) || credits < 0 || credits > MAX_CREDITS) {
                return NextResponse.json(
                    { error: `credits_remaining must be an integer between 0 and ${MAX_CREDITS}` },
                    { status: 400 }
                );
            }
        }

        const target = await db.users.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true, status: true },
        });
        if (!target) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Admins cannot demote or suspend themselves — prevents locking
        // yourself (or the last admin) out mid-session.
        if (userId === auth.user.id) {
            if (role !== undefined && role !== "ADMIN") {
                return NextResponse.json(
                    { error: "You cannot remove your own admin role" },
                    { status: 400 }
                );
            }
            if (status !== undefined && status !== "ACTIVE") {
                return NextResponse.json(
                    { error: "You cannot suspend your own account" },
                    { status: 400 }
                );
            }
        }

        // Update user role/status if provided
        const userData: Record<string, unknown> = {};
        if (role !== undefined) userData.role = role;
        if (status !== undefined) userData.status = status;
        if (Object.keys(userData).length > 0) {
            await db.users.update({
                where: { id: userId },
                data: userData,
            });
        }

        // Update subscription if plan/credits provided
        if (plan_type !== undefined || credits !== undefined) {
            const existingSub = await db.subscriptions.findFirst({
                where: { user_id: userId },
            });

            const updateData: Record<string, unknown> = {};
            if (plan_type !== undefined) updateData.plan_type = plan_type;
            if (credits !== undefined) updateData.credits_remaining = credits;

            if (existingSub) {
                await db.subscriptions.update({
                    where: { id: existingSub.id },
                    data: updateData,
                });
            } else if (plan_type !== undefined) {
                await db.subscriptions.create({
                    data: {
                        user_id: userId,
                        plan_type,
                        credits_remaining: credits ?? 3,
                        credits_total: credits ?? 3,
                    },
                });
            }
        }

        await logAdminAction({
            admin: auth.user,
            action: "USER_UPDATE",
            targetType: "user",
            targetId: userId,
            details: {
                targetEmail: target.email,
                before: { role: target.role, status: target.status },
                changes: { role, status, plan_type, credits_remaining: credits },
            },
            req,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[ADMIN_USER_PATCH]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE - Remove user and all related data (cascade)
export async function DELETE(req: Request, { params }: RouteParams) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { userId } = await params;

    try {
        // Prevent self-deletion
        if (userId === auth.user.id) {
            return NextResponse.json({ error: "Cannot delete your own admin account" }, { status: 400 });
        }

        const target = await db.users.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true },
        });
        if (!target) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Other admins must be demoted to USER before they can be deleted —
        // stops one compromised admin session from wiping out the rest.
        if (target.role === "ADMIN") {
            return NextResponse.json(
                { error: "Demote this admin to USER before deleting the account" },
                { status: 400 }
            );
        }

        await db.users.delete({ where: { id: userId } });

        await logAdminAction({
            admin: auth.user,
            action: "USER_DELETE",
            targetType: "user",
            targetId: userId,
            details: { targetEmail: target.email },
            req,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[ADMIN_USER_DELETE]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
