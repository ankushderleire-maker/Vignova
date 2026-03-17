"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    CreditCard,
    BarChart3,
    ArrowLeft,
    Shield,
    Package,
} from "lucide-react";

const adminNav = [
    { name: "Overview", href: "/admin", icon: LayoutDashboard },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Plans", href: "/admin/plans", icon: Package },
    { name: "Payments", href: "/admin/payments", icon: CreditCard },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <div className="flex h-full w-64 flex-col bg-zinc-950 border-r border-white/10 relative overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-red-500/5 to-transparent pointer-events-none" />

            {/* Logo */}
            <div className="flex h-16 items-center px-6 border-b border-white/10 gap-3">
                <Shield className="w-5 h-5 text-red-500" />
                <span className="text-lg font-bold text-white tracking-wider">
                    Admin<span className="text-red-500">Panel</span>
                </span>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-1 px-3 py-6 z-10">
                {adminNav.map((item) => {
                    const isActive =
                        item.href === "/admin"
                            ? pathname === "/admin"
                            : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : "text-gray-400 hover:bg-white/5 hover:text-white border border-transparent"
                                }`}
                        >
                            <item.icon
                                className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? "text-red-400" : "text-gray-500 group-hover:text-white"
                                    }`}
                            />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Back to Dashboard */}
            <div className="px-3 pb-6 z-10">
                <Link
                    href="/dashboard"
                    className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all border border-transparent"
                >
                    <ArrowLeft className="mr-3 h-5 w-5" />
                    Back to Dashboard
                </Link>
            </div>
        </div>
    );
}
