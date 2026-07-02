import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
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
            createdAt: user.created_at,
            subscription: user.subscriptions?.[0] || null,
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

// PATCH - Update user details
export async function PATCH(req: Request, { params }: RouteParams) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { userId } = await params;

    try {
        const body = await req.json();
        const { role, plan_type, credits_remaining } = body;

        // Update user role if provided
        if (role) {
            await db.users.update({
                where: { id: userId },
                data: { role },
            });
        }

        // Update subscription if plan/credits provided
        if (plan_type || credits_remaining !== undefined) {
            const existingSub = await db.subscriptions.findFirst({
                where: { user_id: userId },
            });

            const updateData: Record<string, unknown> = {};
            if (plan_type) updateData.plan_type = plan_type;
            if (credits_remaining !== undefined) updateData.credits_remaining = credits_remaining;

            if (existingSub) {
                await db.subscriptions.update({
                    where: { id: existingSub.id },
                    data: updateData,
                });
            } else if (plan_type) {
                await db.subscriptions.create({
                    data: {
                        user_id: userId,
                        plan_type,
                        credits_remaining: credits_remaining ?? 3,
                        credits_total: credits_remaining ?? 3,
                    },
                });
            }
        }

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
        if (auth.user && userId === auth.user.id) {
            return NextResponse.json({ error: "Cannot delete your own admin account" }, { status: 400 });
        }

        await db.users.delete({ where: { id: userId } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[ADMIN_USER_DELETE]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
