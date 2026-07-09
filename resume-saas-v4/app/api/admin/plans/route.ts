import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, logAdminAction, VALID_PLANS } from "@/lib/admin-guard";

// GET all plan configs
export async function GET() {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const plans = await db.plan_configs.findMany({
        orderBy: { monthly_price: "asc" },
    });

    return NextResponse.json(plans);
}

// Whitelist of fields an admin may change — anything else in the body is
// dropped so a crafted request can't touch ids, timestamps, or unknown columns.
const STRING_FIELDS = [
    "name",
    "description",
    "resume_creation_label",
    "ai_optimization_label",
    "templates_label",
    "support_label",
] as const;
const BOOLEAN_FIELDS = [
    "has_extension_access",
    "has_multi_profile",
    "has_unlimited_resumes",
    "has_linkedin_optimization",
    "has_interview_prep",
    "is_popular",
] as const;

// PATCH - update a plan config
export async function PATCH(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    try {
        const body = await req.json();
        const { plan_type } = body;

        if (!plan_type || !VALID_PLANS.includes(plan_type)) {
            return NextResponse.json(
                { error: `plan_type must be one of: ${VALID_PLANS.join(", ")}` },
                { status: 400 }
            );
        }

        const updates: Record<string, unknown> = {};

        for (const field of STRING_FIELDS) {
            if (body[field] !== undefined) {
                const v = String(body[field]).trim().slice(0, 500);
                if (!v && (field === "name" || field === "description")) {
                    return NextResponse.json({ error: `${field} cannot be empty` }, { status: 400 });
                }
                updates[field] = v;
            }
        }

        for (const field of BOOLEAN_FIELDS) {
            if (body[field] !== undefined) {
                if (typeof body[field] !== "boolean") {
                    return NextResponse.json({ error: `${field} must be a boolean` }, { status: 400 });
                }
                updates[field] = body[field];
            }
        }

        if (body.monthly_price !== undefined) {
            const price = Number(body.monthly_price);
            if (!Number.isFinite(price) || price < 0 || price > 100000) {
                return NextResponse.json(
                    { error: "monthly_price must be a number between 0 and 100000" },
                    { status: 400 }
                );
            }
            updates.monthly_price = price;
        }

        if (body.credits !== undefined) {
            const credits = Number(body.credits);
            if (!Number.isInteger(credits) || credits < 0 || credits > 100000) {
                return NextResponse.json(
                    { error: "credits must be an integer between 0 and 100000" },
                    { status: 400 }
                );
            }
            updates.credits = credits;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        const plan = await db.plan_configs.update({
            where: { plan_type },
            data: updates,
        });

        await logAdminAction({
            admin: auth.user,
            action: "PLAN_UPDATE",
            targetType: "plan",
            targetId: plan_type,
            details: { updates },
            req,
        });

        return NextResponse.json(plan);
    } catch (error) {
        console.error("[ADMIN_PLANS_PATCH]", error);
        return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
    }
}
