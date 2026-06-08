"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { OnboardingTour } from "@/components/OnboardingTour";

export default function DashboardLayoutContent({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    // Close drawer on route change
    useEffect(() => {
        setIsMobileSidebarOpen(false);
    }, [pathname]);

    const isStudio = pathname.startsWith("/dashboard/jobs/") && pathname.split("/").length > 3;

    if (isStudio) {
        return (
            <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden font-sans">
                <main className="flex-1 relative overflow-y-auto bg-[var(--background)] h-full">
                    <div className="absolute inset-0 z-0 pointer-events-none fixed" />
                    <div className="relative z-10 h-full">
                        {children}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden font-sans transition-colors duration-300">
            {/* Desktop Sidebar (fixed, hidden on mobile) */}
            <div className="hidden md:flex md:w-64 md:flex-col fixed inset-y-0 z-50 transition-colors duration-300">
                <Sidebar />
            </div>

            {/* Mobile Sidebar Drawer */}
            {isMobileSidebarOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsMobileSidebarOpen(false)}
                    />
                    {/* Drawer panel */}
                    <div className="absolute left-0 top-0 bottom-0 w-72 animate-drawer-slide-in">
                        <Sidebar onClose={() => setIsMobileSidebarOpen(false)} />
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col md:pl-64 h-full min-w-0">
                <Header onMenuClick={() => setIsMobileSidebarOpen(true)} />

                <main id="dashboard-main-scroll" className="flex-1 relative overflow-y-auto overflow-x-hidden bg-[var(--background)] transition-colors duration-300">
                    <div className="absolute inset-0 z-0 pointer-events-none fixed" />
                    <div className="relative z-10 p-4 md:p-8 w-full max-w-full">
                        {children}
                    </div>
                </main>
            </div>

            <OnboardingTour />
        </div>
    );
}
