import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

// GET all plan configs
export async function GET() {
    const adminCheck = await requireAdmin();
    if (adminCheck instanceof NextResponse) return adminCheck;

    const plans = await db.plan_configs.findMany({
        orderBy: { monthly_price: "asc" },
    });

    return NextResponse.json(plans);
}

// PATCH - update a plan config
export async function PATCH(req: NextRequest) {
    const adminCheck = await requireAdmin();
    if (adminCheck instanceof NextResponse) return adminCheck;

    try {
        const body = await req.json();
        const { plan_type, ...updates } = body;

        if (!plan_type) {
            return NextResponse.json({ error: "plan_type is required" }, { status: 400 });
        }

        const plan = await db.plan_configs.update({
            where: { plan_type },
            data: updates,
        });

        return NextResponse.json(plan);
    } catch (error) {
        console.error("[ADMIN_PLANS_PATCH]", error);
        return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
    }
}
