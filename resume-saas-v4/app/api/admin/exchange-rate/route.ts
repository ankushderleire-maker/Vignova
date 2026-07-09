import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, logAdminAction } from "@/lib/admin-guard";

export async function GET() {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    try {
        let rateEntry = await db.exchange_rates.findFirst({
            where: { base_currency: "USD", target_currency: "INR" }
        });

        if (!rateEntry) {
            rateEntry = await db.exchange_rates.create({
                data: {
                    base_currency: "USD",
                    target_currency: "INR",
                    rate: 84.50,
                    updated_by: auth.user.id
                }
            });
        }

        return NextResponse.json({ rate: rateEntry.rate });
    } catch (error) {
        console.error("[ADMIN_EXCHANGE_RATE_GET]", error);
        return NextResponse.json({ error: "Failed to load exchange rate" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    try {
        const body = await req.json();
        const rate = Number(body?.rate);
        // Sanity bounds — a fat-fingered rate (0.85 or 8450) would misprice
        // every INR checkout on the site.
        if (!Number.isFinite(rate) || rate <= 0 || rate > 10000) {
            return NextResponse.json(
                { error: "rate must be a positive number (max 10000)" },
                { status: 400 }
            );
        }

        let rateEntry = await db.exchange_rates.findFirst({
            where: { base_currency: "USD", target_currency: "INR" }
        });

        const previousRate = rateEntry?.rate ?? null;

        if (rateEntry) {
            rateEntry = await db.exchange_rates.update({
                where: { id: rateEntry.id },
                data: { rate, updated_by: auth.user.id }
            });
        } else {
            rateEntry = await db.exchange_rates.create({
                data: {
                    base_currency: "USD",
                    target_currency: "INR",
                    rate,
                    updated_by: auth.user.id
                }
            });
        }

        await logAdminAction({
            admin: auth.user,
            action: "EXCHANGE_RATE_UPDATE",
            targetType: "exchange_rate",
            targetId: "USD/INR",
            details: { previousRate, newRate: rate },
            req,
        });

        return NextResponse.json({ success: true, rate: rateEntry.rate });
    } catch (error) {
        console.error("[ADMIN_EXCHANGE_RATE_POST]", error);
        return NextResponse.json({ error: "Failed to update exchange rate" }, { status: 500 });
    }
}
