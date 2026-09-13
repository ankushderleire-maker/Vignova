import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, logAdminAction } from "@/lib/admin-guard";
import { DEFAULT_PLANS } from "@/lib/planCatalog";

/**
 * POST /api/admin/plans/seed - reset every plan to the default catalog.
 *
 * This button used to keep its own copy of the plans, and it had fallen behind:
 * it wrote PRO 40 / PREMIUM 150, a Free plan without the extension or interview
 * prep, and it never set the per-bucket allowances at all. Pressing it undid
 * the credit-bucket rollout on the pricing page. It now writes the same
 * catalog as prisma/seed-plans.ts.
 */
export async function POST(req: Request) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    try {
        for (const plan of DEFAULT_PLANS) {
            await db.plan_configs.upsert({
                where: { plan_type: plan.plan_type },
                update: plan,
                create: plan,
            });
        }

        await logAdminAction({
            admin: auth.user,
            action: "PLANS_SEED",
            targetType: "plan",
            req,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[ADMIN_PLANS_SEED]", error);
        return NextResponse.json({ error: "Failed to seed plans" }, { status: 500 });
    }
}
