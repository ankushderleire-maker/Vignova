import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        
        const user = await db.users.findUnique({ where: { email: session.user.email } });
        if (user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        let rateEntry = await db.exchange_rates.findFirst({
            where: { base_currency: "USD", target_currency: "INR" }
        });
        
        if (!rateEntry) {
            rateEntry = await db.exchange_rates.create({
                data: {
                    base_currency: "USD",
                    target_currency: "INR",
                    rate: 84.50,
                    updated_by: user.id
                }
            });
        }

        return NextResponse.json({ rate: rateEntry.rate });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        
        const user = await db.users.findUnique({ where: { email: session.user.email } });
        if (user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = await req.json();
        const { rate } = body;
        if (!rate || typeof rate !== 'number') return NextResponse.json({ error: "Invalid rate" }, { status: 400 });

        let rateEntry = await db.exchange_rates.findFirst({
            where: { base_currency: "USD", target_currency: "INR" }
        });
        
        if (rateEntry) {
            rateEntry = await db.exchange_rates.update({
                where: { id: rateEntry.id },
                data: { rate, updated_by: user.id }
            });
        } else {
            rateEntry = await db.exchange_rates.create({
                data: {
                    base_currency: "USD",
                    target_currency: "INR",
                    rate,
                    updated_by: user.id
                }
            });
        }
        
        return NextResponse.json({ success: true, rate: rateEntry.rate });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
