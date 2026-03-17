"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Loader2, ShieldAlert } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
        );
    }

    // @ts-ignore - role is added via custom NextAuth callbacks
    const role = session?.user?.role;

    if (role !== "ADMIN") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-4">
                <ShieldAlert className="w-16 h-16 text-red-500" />
                <h1 className="text-2xl font-bold text-white">Access Denied</h1>
                <p className="text-gray-400">You do not have admin privileges.</p>
                <button
                    onClick={() => router.push("/dashboard")}
                    className="mt-4 px-6 py-2 bg-white/10 border border-white/10 rounded-lg text-white hover:bg-white/20 transition-all"
                >
                    Go to Dashboard
                </button>
            </div>
        );
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
