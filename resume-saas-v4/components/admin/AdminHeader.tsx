"use client";

import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
    "/admin": "Dashboard Overview",
    "/admin/users": "User Management",
    "/admin/plans": "Plan Management",
    "/admin/payments": "Payment History",
    "/admin/analytics": "Analytics",
    "/admin/scan-controls": "Scan Controls",
    "/admin/extension": "Extension Settings",
    "/admin/audit-log": "Audit Log",
};

export function AdminHeader() {
    const pathname = usePathname();

    // Find title, handle dynamic routes like /admin/users/[id]
    const title =
        PAGE_TITLES[pathname] ||
        (pathname.startsWith("/admin/users/") ? "User Detail" : "Admin");

    return (
        <header className="h-16 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40">
            <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold text-white">{title}</h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <Shield className="w-4 h-4 text-red-500" />
                <span className="text-red-400 font-medium">ADMIN MODE</span>
            </div>
        </header>
    );
}
