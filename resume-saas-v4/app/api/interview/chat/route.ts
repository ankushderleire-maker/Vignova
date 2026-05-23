import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || "http://localhost:8000";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  let userProfile: any = null;
  try {
    const profileRow = await db.master_profiles.findFirst({
      where: { user_id: userId },
      orderBy: { updated_at: "desc" },
    });
    userProfile = profileRow?.parsed_data ?? null;
  } catch (_) {}

  const res = await fetch(`${AI_BACKEND_URL}/api/interview/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, user_profile: userProfile }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
