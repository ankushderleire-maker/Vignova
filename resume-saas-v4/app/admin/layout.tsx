import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/login");
    }

    // DB-authoritative role check — not trusting client-visible session
    const user = await db.users.findUnique({
        where: { email: session.user.email },
        select: { role: true, status: true },
    });

    if (user?.role !== "ADMIN" || user.status === "SUSPENDED") {
        redirect("/dashboard");
    }

    return (
        <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
            {/* Sidebar */}
            <div className="hidden md:flex md:w-64 md:flex-col fixed inset-y-0 z-50">
                <AdminSidebar />
            </div>

            {/* Main */}
            <div className="flex flex-1 flex-col md:pl-64 h-full">
                <AdminHeader />
                <main className="flex-1 relative overflow-y-auto bg-black">
                    {/* Background */}
                    <div className="absolute inset-0 z-0 pointer-events-none fixed">
                        <div className="absolute top-0 left-0 right-0 h-[500px] bg-[radial-gradient(circle_at_50%_-20%,#ef4444_0%,transparent_60%)] opacity-5" />
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
                    </div>
                    <div className="relative z-10 p-8">{children}</div>
                </main>
            </div>
        </div>
    );
}
