import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) return new NextResponse("Unauthorized", { status: 401 });

    const userId = (session?.user as any)?.id as string;

    // 1. Get current subscription/credits
    const sub = await db.subscriptions.findFirst({
      where: { user_id: userId }
    });

    if (!sub) {
      // Create a default free sub if missing (failsafe)
      await db.subscriptions.create({ data: { user_id: userId, credits_remaining: 3 } });
      return NextResponse.json({ success: true, remaining: 3 });
    }

    if (sub.credits_remaining <= 0) {
      return new NextResponse("Insufficient Credits", { status: 403 });
    }

    // 2. Deduct 1 Credit
    const updatedSub = await db.subscriptions.update({
      where: { id: sub.id },
      data: { credits_remaining: sub.credits_remaining - 1 }
    });

    return NextResponse.json({ success: true, remaining: updatedSub.credits_remaining });
  } catch (error) {
    console.error("[CREDIT_DEDUCT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}