import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEFAULT_PLANS } from "@/lib/planCatalog";

// Public: GET plan configs for the billing and checkout pages.
//
// DEFAULT_PLANS is only used while plan_configs has no rows. It is the same
// catalog the seed script and the admin seed button write, so the page renders
// the numbers the database will hold once it is seeded, never a third copy.
export async function GET() {
    try {
        const plans = await db.plan_configs.findMany({
            orderBy: { monthly_price: "asc" },
        });
        return NextResponse.json(plans.length > 0 ? plans : DEFAULT_PLANS);
    } catch {
        return NextResponse.json(DEFAULT_PLANS);
    }
}
