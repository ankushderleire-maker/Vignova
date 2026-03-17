"use client";

import { useEffect, useState } from "react";
import { AdminStatCard } from "@/components/admin/StatsCards";
import { Users, DollarSign, FileText, Briefcase, Crown, UserPlus } from "lucide-react";
import { Loader2 } from "lucide-react";

interface Stats {
    totalUsers: number;
    totalResumes: number;
    totalJobs: number;
    totalPayments: number;
    activeSubscriptions: number;
    totalRevenue: number;
    newUsersToday: number;
    recentUsers: Array<{
        id: string;
        email: string;
        full_name: string | null;
        created_at: string;
    }>;
    planDistribution: Array<{ plan: string; count: number }>;
}

export default function AdminOverviewPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/stats")
            .then((r) => r.json())
            .then(setStats)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
        );
    }

    if (!stats) return <p className="text-red-400">Failed to load stats.</p>;

    return (
        <div className="space-y-8 max-w-7xl mx-auto animate-slide-down">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AdminStatCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon={Users}
                    color="#ef4444"
                    subtitle={`+${stats.newUsersToday} today`}
                />
                <AdminStatCard
                    title="Total Revenue"
                    value={`$${stats.totalRevenue.toFixed(2)}`}
                    icon={DollarSign}
                    color="#22c55e"
                    subtitle={`${stats.totalPayments} payments`}
                />
                <AdminStatCard
                    title="Resumes Created"
                    value={stats.totalResumes}
                    icon={FileText}
                    color="#3b82f6"
                />
                <AdminStatCard
                    title="Active Subscriptions"
                    value={stats.activeSubscriptions}
                    icon={Crown}
                    color="#f59e0b"
                    subtitle="Pro + Premium"
                />
                <AdminStatCard
                    title="Jobs Tracked"
                    value={stats.totalJobs}
                    icon={Briefcase}
                    color="#8b5cf6"
                />
                <AdminStatCard
                    title="New Today"
                    value={stats.newUsersToday}
                    icon={UserPlus}
                    color="#06b6d4"
                />
            </div>

            {/* Plan Distribution */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Plan Distribution</h3>
                <div className="flex gap-6 flex-wrap">
                    {stats.planDistribution.map((p) => {
                        const colors: Record<string, string> = {
                            FREE: "#6b7280",
                            PRO: "#22c55e",
                            PREMIUM: "#f59e0b",
                        };
                        return (
                            <div key={p.plan} className="flex items-center gap-3">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: colors[p.plan] || "#6b7280" }}
                                />
                                <span className="text-sm text-gray-300">{p.plan}</span>
                                <span className="text-xl font-bold text-white">{p.count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Recent Signups */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Recent Signups</h3>
                <div className="space-y-3">
                    {stats.recentUsers.length === 0 ? (
                        <p className="text-sm text-gray-500">No recent signups</p>
                    ) : (
                        stats.recentUsers.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                            >
                                <div>
                                    <p className="text-sm text-white">{user.full_name || "—"}</p>
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                </div>
                                <span className="text-xs text-gray-500">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
