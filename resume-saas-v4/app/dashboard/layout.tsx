import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import DashboardLayoutContent from "./DashboardLayoutContent";

// Force dynamic rendering so the session check runs on every request.
// Without this, Next.js may statically optimise the layout and skip the
// server-side auth gate, allowing unauthenticated users to see the shell.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense-in-depth auth check.
  // The Edge `middleware.ts` (withAuth) is the primary gate, but if it ever
  // misfires (env misconfig, stale build, matcher bug, etc.) this server-side
  // guard ensures the dashboard shell is never rendered for an unauthenticated
  // request. API routes are independently protected via getServerSession.
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const dbUser = await db.users.findUnique({
    where: { email: session.user.email },
    select: { country: true }
  });

  if (!dbUser?.country) {
    redirect("/complete-profile");
  }

  return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}