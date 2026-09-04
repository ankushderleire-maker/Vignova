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
        if (!isMobileSidebarOpen) return;

        const timeout = window.setTimeout(() => setIsMobileSidebarOpen(false), 0);
        return () => window.clearTimeout(timeout);
    }, [isMobileSidebarOpen, pathname]);

    const isStudio = pathname.startsWith("/dashboard/jobs/") && pathname.split("/").length > 3;

    if (isStudio) {
        return (
            <div className="flex h-screen overflow-hidden bg-[#f4f8ff] font-sans text-[#081432]">
                <main className="relative h-full flex-1 overflow-y-auto bg-[#f4f8ff]">
                    <div className="absolute inset-0 z-0 pointer-events-none fixed" />
                    <div className="relative z-10 h-full">
                        {children}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-[#f4f8ff] font-sans text-[#081432] transition-colors duration-300">
            {/* Desktop Sidebar (fixed, hidden on mobile) */}
            <div className="fixed inset-y-0 z-50 hidden md:flex md:w-72 md:flex-col transition-colors duration-300">
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
            <div className="flex h-full min-w-0 flex-1 flex-col md:pl-72">
                <Header onMenuClick={() => setIsMobileSidebarOpen(true)} />

                <main id="dashboard-main-scroll" className="relative flex-1 overflow-y-auto overflow-x-hidden bg-[#f4f8ff] transition-colors duration-300">
                    <div className="absolute inset-0 z-0 pointer-events-none fixed" />
                    <div className="relative z-10 w-full max-w-full px-4 pb-6 pt-2 md:px-8 md:pb-8 md:pt-0">
                        {children}
                    </div>
                </main>
            </div>

            <OnboardingTour />
        </div>
    );
}
