"use client";

import React from "react";
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

    // Check if we are in Studio mode (job detail/editor page)
    // Matches: /dashboard/jobs/[jobId]
    // Excludes: /dashboard/jobs (the list page)
    const isStudio = pathname.startsWith("/dashboard/jobs/") && pathname.split("/").length > 3;
    const isInterview = pathname === "/dashboard/interview-prep";

    if (isStudio) {
        return (
            <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden font-sans">
                {/* Full screen content without sidebar/header */}
                <main className="flex-1 relative overflow-y-auto bg-[var(--background)] h-full">
                    {/* Background elements removed for pure white background */}
                    <div className="absolute inset-0 z-0 pointer-events-none fixed" />

                    {/* Render children directly taking full height */}
                    <div className="relative z-10 h-full">
                        {children}
                    </div>
                </main>
            </div>
        );
    }

    // Standard Dashboard Layout
    return (
        <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden font-sans transition-colors duration-300">
            {/* Sidebar (Fixed width) */}
            <div className="hidden md:flex md:w-64 md:flex-col fixed inset-y-0 z-50 transition-colors duration-300">
                <Sidebar />
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col md:pl-64 h-full min-w-0">
                {/* Top Header */}
                <Header />

                {/* Scrollable Content Wrapper */}
                <main id="dashboard-main-scroll" className="flex-1 relative overflow-y-auto overflow-x-hidden bg-[var(--background)] transition-colors duration-300">
                    {/* Background elements removed for pure white background */}
                    <div className="absolute inset-0 z-0 pointer-events-none fixed" />

                    <div className="relative z-10 p-4 md:p-8 w-full max-w-full">
                        {children}
                    </div>
                </main>
            </div>

            {/* Onboarding Tour (first-time users only) */}
            <OnboardingTour />
        </div>
    );
}
