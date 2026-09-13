// components/dashboard/SubscriptionCard.tsx
"use client";

import { Crown, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./DashboardCard.module.css";

export interface SubscriptionBucket {
    bucket: "tailoring" | "writing" | "interview";
    label: string;
    remaining: number;
    total: number;
    unlimited: boolean;
}

interface SubscriptionCardProps {
    plan: string;
    /** From /api/subscription: one entry per credit bucket. */
    buckets?: SubscriptionBucket[];
}

/**
 * The plan, and what is left of each allowance this month.
 *
 * This used to show one "credits left" number read from the legacy single
 * pool, which nothing spends from any more, so it could sit at 1 while every
 * bucket was full. Each bucket is its own balance and gets its own row.
 */
export function SubscriptionCard({ plan, buckets = [] }: SubscriptionCardProps) {
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

                {/* Credits, one bar per bucket */}
                <div className="mt-auto">
                    <div className="space-y-2.5 mb-4">
                        {buckets.length === 0 ? (
                            <p className="text-xs text-[var(--text-secondary)]">Loading credits...</p>
                        ) : (
                            buckets.map((bucket) => {
                                const percent = bucket.unlimited
                                    ? 100
                                    : bucket.total > 0
                                      ? Math.min(Math.max((bucket.remaining / bucket.total) * 100, 0), 100)
                                      : 0;
                                const empty = !bucket.unlimited && bucket.remaining <= 0;
                                return (
                                    <div key={bucket.bucket}>
                                        <div className="flex items-baseline justify-between gap-2 text-xs mb-1">
                                            <span className="text-[var(--text-secondary)]">{bucket.label}</span>
                                            <span className={`font-semibold tabular-nums ${empty ? "text-rose-500" : "text-[var(--foreground)]"}`}>
                                                {bucket.unlimited ? "Unlimited" : `${bucket.remaining} / ${bucket.total}`}
                                            </span>
                                        </div>
                                        <div className="bg-[var(--foreground)]/10 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="h-full transition-all duration-500"
                                                style={{ width: `${percent}%`, backgroundColor: empty ? "#F43F5E" : color }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
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
