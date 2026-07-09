"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    Loader2, ArrowLeft, Mail, Calendar, Shield, Crown,
    FileText, Briefcase, CreditCard,
} from "lucide-react";

interface UserDetail {
    id: string;
    email: string;
    fullName: string | null;
    role: string;
    status?: string;
    createdAt: string;
    subscription: {
        plan_type: string;
        billing_cycle: string;
        credits_remaining: number;
        credits_total: number;
        expires_at: string | null;
    } | null;
    profiles: Array<{ id: string; name: string; is_default: boolean }>;
    resumes: Array<{ id: string; name: string; source: string; createdAt: string }>;
    jobs: Array<{ id: string; company: string; jobTitle: string; status: string; createdAt: string }>;
    payments: Array<{
        id: string; amount: number; currency: string; status: string;
        planType: string; billingCycle: string; createdAt: string;
    }>;
}

export default function AdminUserDetailPage() {
    const { userId } = useParams();
    const router = useRouter();
    const [user, setUser] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/admin/users/${userId}`)
            .then((r) => r.json())
            .then(setUser)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [userId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
        );
    }

    if (!user) return <p className="text-red-400">User not found.</p>;

    const statusBadge = (status: string) => {
        const c: Record<string, string> = {
            COMPLETED: "text-green-400 bg-green-400/10",
            PENDING: "text-amber-400 bg-amber-400/10",
            FAILED: "text-red-400 bg-red-400/10",
            SAVED: "text-blue-400 bg-blue-400/10",
            APPLIED: "text-green-400 bg-green-400/10",
            INTERVIEW: "text-purple-400 bg-purple-400/10",
        };
        return (
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${c[status] || "text-gray-400 bg-gray-400/10"}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto animate-slide-down">
            {/* Back */}
            <button
                onClick={() => router.push("/admin/users")}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Users
            </button>

            {/* User Header */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white">{user.fullName || "Unnamed User"}</h2>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {user.email}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${user.status === "SUSPENDED" ? "text-red-400 bg-red-400/10" : "text-green-400 bg-green-400/10"}`}>
                            {user.status || "ACTIVE"}
                        </span>
                        <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded ${user.role === "ADMIN" ? "text-red-400 bg-red-400/10" : "text-gray-400 bg-gray-400/10"}`}>
                            <Shield className="w-3 h-3" /> {user.role}
                        </span>
                    </div>
                </div>
            </div>

            {/* Subscription */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Crown className="w-4 h-4" /> Subscription
                </h3>
                {user.subscription ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-xs text-gray-500">Plan</p>
                            <p className="text-white font-bold">{user.subscription.plan_type}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Billing Cycle</p>
                            <p className="text-white">{user.subscription.billing_cycle}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Credits</p>
                            <p className="text-white">{user.subscription.credits_remaining} / {user.subscription.credits_total}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Expires</p>
                            <p className="text-white">
                                {user.subscription.expires_at
                                    ? new Date(user.subscription.expires_at).toLocaleDateString()
                                    : "Never"}
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">No active subscription (Free plan)</p>
                )}
            </div>

            {/* Resumes */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Resumes ({user.resumes.length})
                </h3>
                {user.resumes.length === 0 ? (
                    <p className="text-sm text-gray-500">No resumes created</p>
                ) : (
                    <div className="space-y-2">
                        {user.resumes.map((r) => (
                            <div key={r.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                <div>
                                    <p className="text-sm text-white">{r.name}</p>
                                    <p className="text-xs text-gray-500">Source: {r.source}</p>
                                </div>
                                <span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Jobs */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> Job Applications ({user.jobs.length})
                </h3>
                {user.jobs.length === 0 ? (
                    <p className="text-sm text-gray-500">No job applications</p>
                ) : (
                    <div className="space-y-2">
                        {user.jobs.map((j) => (
                            <div key={j.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                <div>
                                    <p className="text-sm text-white">{j.jobTitle}</p>
                                    <p className="text-xs text-gray-500">{j.company}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {statusBadge(j.status)}
                                    <span className="text-xs text-gray-500">{new Date(j.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Payments */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Payments ({user.payments.length})
                </h3>
                {user.payments.length === 0 ? (
                    <p className="text-sm text-gray-500">No payments</p>
                ) : (
                    <div className="space-y-2">
                        {user.payments.map((p) => (
                            <div key={p.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                <div>
                                    <p className="text-sm text-white">${p.amount.toFixed(2)} {p.currency}</p>
                                    <p className="text-xs text-gray-500">{p.planType} • {p.billingCycle}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {statusBadge(p.status)}
                                    <span className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
