// components/dashboard/SubscriptionCard.tsx
"use client";

import { Crown, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./DashboardCard.module.css";

interface SubscriptionCardProps {
    plan: string;
    creditsRemaining: number;
}

export function SubscriptionCard({ plan, creditsRemaining }: SubscriptionCardProps) {
    const router = useRouter();
    const isPremium = plan?.toUpperCase() === "PREMIUM";
    const isPro = plan?.toUpperCase() === "PRO";
    const isPaid = isPremium || isPro;
    const color = isPremium ? "#F59E0B" : isPro ? "#3B82F6" : "#6B7280"; // Amber for Premium, Blue for Pro, Gray for Free

    return (
        <div className={styles.cardWrapper} style={{ "--border-color": color } as React.CSSProperties}>
            <div className={styles.innerCard}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        {isPremium ? (
                            <Crown className="w-5 h-5 text-amber-500" />
                        ) : isPro ? (
                            <Crown className="w-5 h-5 text-blue-500" />
                        ) : (
                            <Zap className="w-5 h-5 text-gray-500" />
                        )}
                        <span className="text-[var(--text-secondary)] text-sm font-medium">Subscription</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${isPremium ? "bg-amber-500/10 text-amber-500" : isPro ? "bg-blue-500/10 text-blue-500" : "bg-gray-500/10 text-gray-500"}`}>
                        {plan}
                    </span>
                </div>

                {/* Credits Info */}
                <div className="mt-auto">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-3xl font-bold text-[var(--foreground)]">{creditsRemaining}</span>
                        <span className="text-[var(--text-secondary)] text-sm mb-1">credits left</span>
                    </div>

                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden mb-4">
                        <div
                            className="h-full transition-all duration-500"
                            style={{
                                width: `${Math.min((creditsRemaining / (isPremium ? 150 : isPro ? 50 : 3)) * 100, 100)}%`,
                                backgroundColor: color
                            }}
                        />
                    </div>

                    <button
                        onClick={() => router.push("/dashboard/billing")}
                        className={`w-full py-2 rounded-lg font-medium text-sm transition-all border ${isPremium
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20"
                            : isPro
                                ? "bg-blue-500/10 border-blue-500/20 text-blue-500 hover:bg-blue-500/20"
                                : "bg-gray-500/10 border-gray-500/20 text-gray-500 hover:bg-gray-500/20"
                            }`}
                    >
                        {isPaid ? "Manage Plan" : "Upgrade Plan"}
                    </button>
                </div>
            </div>
        </div>
    );
}
