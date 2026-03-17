// components/dashboard/StatCard.tsx
"use client";

import { LucideIcon } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import styles from "./DashboardCard.module.css";

interface StatCardProps {
    title: string;
    count: number;
    icon: LucideIcon;
    trend?: number;
    color?: string;
    jobStats?: {
        saved: number;
        applied: number;
        interviewing: number;
        offer: number;
    };
}

export function StatCard({ title, count, icon: Icon, trend, color = "var(--primary)", jobStats }: StatCardProps) {
    const animatedCount = useCountUp(count, 1500);

    return (
        <div className={styles.cardWrapper} style={{ "--border-color": color } as React.CSSProperties}>
            <div className={styles.innerCard}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="relative">
                        <div
                            className="absolute inset-0 rounded-xl"
                            style={{
                                background: color,
                                opacity: 0.2,
                                filter: "blur(8px)"
                            }}
                        />
                        <div
                            className="relative p-3 rounded-xl"
                            style={{ backgroundColor: `${color}15` }}
                        >
                            <Icon className="w-6 h-6" style={{ color }} />
                        </div>
                    </div>

                    {trend !== undefined && (
                        <div className={`flex items-center gap-1 text-sm font-medium ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
                            <span>{trend >= 0 ? "↑" : "↓"}</span>
                            <span>{Math.abs(trend)}%</span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="mt-auto flex justify-between items-center bg-transparent">
                    <div className="flex-1">
                        <p className="text-[var(--text-secondary)] text-sm mb-1">{title}</p>
                        <p className="text-[2.5rem] leading-none font-bold text-[var(--foreground)] tracking-tight">
                            {animatedCount}
                        </p>
                    </div>

                    {/* Optional Job Stats Breakdown */}
                    {jobStats && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-l border-[var(--border-color)] pl-4 ml-4 min-w-[120px]">
                            {/* Saved */}
                            <div className="flex flex-col border-b border-[var(--border-color)] pb-1">
                                <span className="text-[var(--text-secondary)] font-medium text-[10px] sm:text-xs mb-0.5">Saved</span>
                                <span className="font-bold text-[var(--foreground)] text-sm sm:text-base leading-none">{jobStats.saved}</span>
                            </div>

                            {/* Applied */}
                            <div className="flex flex-col border-b border-[var(--border-color)] pb-1">
                                <span className="text-[var(--text-secondary)] font-medium text-[10px] sm:text-xs mb-0.5">Applied</span>
                                <span className="font-bold text-blue-500 text-sm sm:text-base leading-none">{jobStats.applied}</span>
                            </div>

                            {/* Interviews */}
                            <div className="flex flex-col border-b border-[var(--border-color)] pb-1">
                                <span className="text-[var(--text-secondary)] font-medium text-[10px] sm:text-xs mb-0.5 whitespace-nowrap">Interviews</span>
                                <span className="font-bold text-purple-500 text-sm sm:text-base leading-none">{jobStats.interviewing}</span>
                            </div>

                            {/* Offers */}
                            <div className="flex flex-col border-b border-[var(--border-color)] pb-1">
                                <span className="text-[var(--text-secondary)] font-medium text-[10px] sm:text-xs mb-0.5">Offers</span>
                                <span className="font-bold text-green-500 text-sm sm:text-base leading-none">{jobStats.offer}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
