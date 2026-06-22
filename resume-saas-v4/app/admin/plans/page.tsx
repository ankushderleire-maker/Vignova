"use client";

import { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
    Save,
    Loader2,
    DollarSign,
    CreditCard,
    Star,
    Check,
    X,
    RefreshCw,
} from "lucide-react";

interface PlanConfig {
    id: string;
    plan_type: string;
    name: string;
    description: string;
    monthly_price: number;
    credits: number;
    has_extension_access: boolean;
    has_multi_profile: boolean;
    has_unlimited_resumes: boolean;
    resume_creation_label: string;
    ai_optimization_label: string;
    templates_label: string;
    support_label: string;
    has_linkedin_optimization: boolean;
    has_interview_prep: boolean;
    is_popular: boolean;
}

export default function AdminPlansPage() {
    const [plans, setPlans] = useState<PlanConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [editingPlan, setEditingPlan] = useState<PlanConfig | null>(null);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/plans");
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setPlans(data);
        } catch {
            setMessage({ type: "error", text: "Failed to load plans. Run the seed script first." });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (plan: PlanConfig) => {
        setSaving(plan.plan_type);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/plans", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    plan_type: plan.plan_type,
                    name: plan.name,
                    description: plan.description,
                    monthly_price: plan.monthly_price,
                    credits: plan.credits,
                    has_extension_access: plan.has_extension_access,
                    has_multi_profile: plan.has_multi_profile,
                    has_unlimited_resumes: plan.has_unlimited_resumes,
                    resume_creation_label: plan.resume_creation_label,
                    ai_optimization_label: plan.ai_optimization_label,
                    templates_label: plan.templates_label,
                    support_label: plan.support_label,
                    has_linkedin_optimization: plan.has_linkedin_optimization,
                    has_interview_prep: plan.has_interview_prep,
                    is_popular: plan.is_popular,
                }),
            });
            if (!res.ok) throw new Error("Save failed");
            setMessage({ type: "success", text: `${plan.name} plan updated successfully!` });
            setEditingPlan(null);
            fetchPlans();
        } catch {
            setMessage({ type: "error", text: "Failed to save plan changes." });
        } finally {
            setSaving(null);
        }
    };

    const planColors: Record<string, string> = {
        FREE: "border-gray-500/30 bg-gray-500/5",
        PRO: "border-emerald-500/30 bg-emerald-500/5",
        PREMIUM: "border-amber-500/30 bg-amber-500/5",
    };

    const planAccent: Record<string, string> = {
        FREE: "text-gray-400",
        PRO: "text-emerald-400",
        PREMIUM: "text-amber-400",
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
        );
    }

    return (
        <div>
            <AdminHeader />
            <div className="p-8 space-y-6">
                {/* Status message */}
                {message && (
                    <div className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${message.type === "success"
                        ? "bg-green-500/10 border-green-500/30 text-green-400"
                        : "bg-red-500/10 border-red-500/30 text-red-400"
                        }`}>
                        {message.type === "success" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        {message.text}
                    </div>
                )}

                {/* Info banner */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300">
                    <strong>How it works:</strong> Changes here are saved to the database and immediately sync to the billing page and upgrade logic.
                    When a user purchases a plan, they get the credits and features configured here.
                </div>

                {plans.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <p className="text-lg mb-2">No plans configured yet.</p>
                        <p className="text-sm">Run <code className="bg-white/10 px-2 py-1 rounded">npx tsx prisma/seed-plans.ts</code> to seed default plans.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {plans.map((plan) => {
                            const isEditing = editingPlan?.plan_type === plan.plan_type;
                            const current = isEditing ? editingPlan : plan;

                            return (
                                <div
                                    key={plan.plan_type}
                                    className={`rounded-2xl border p-6 transition-all ${planColors[plan.plan_type] || "border-white/10 bg-white/5"} ${isEditing ? "ring-2 ring-red-500/50" : ""}`}
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg bg-white/10 ${planAccent[plan.plan_type]}`}>
                                                {plan.plan_type === "FREE" ? <CreditCard className="w-5 h-5" /> :
                                                    plan.plan_type === "PRO" ? <Star className="w-5 h-5" /> :
                                                        <DollarSign className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <h3 className={`text-lg font-bold ${planAccent[plan.plan_type]}`}>{plan.name}</h3>
                                                <span className="text-xs text-gray-500 font-mono">{plan.plan_type}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {!isEditing ? (
                                                <button
                                                    onClick={() => setEditingPlan({ ...plan })}
                                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
                                                >
                                                    Edit
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setEditingPlan(null)}
                                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-400 text-sm rounded-lg transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => handleSave(current)}
                                                        disabled={saving === plan.plan_type}
                                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                                                    >
                                                        {saving === plan.plan_type ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Save className="w-4 h-4" />
                                                        )}
                                                        Save
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {/* Name */}
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">Display Name</label>
                                            <input
                                                type="text"
                                                value={current.name}
                                                disabled={!isEditing}
                                                onChange={(e) => setEditingPlan({ ...current, name: e.target.value })}
                                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
                                            />
                                        </div>

                                        {/* Description */}
                                        <div className="md:col-span-2">
                                            <label className="text-xs text-gray-500 mb-1 block">Description</label>
                                            <input
                                                type="text"
                                                value={current.description}
                                                disabled={!isEditing}
                                                onChange={(e) => setEditingPlan({ ...current, description: e.target.value })}
                                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
                                            />
                                        </div>

                                        {/* Monthly Price */}
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">Monthly Price ($)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={current.monthly_price}
                                                disabled={!isEditing}
                                                onChange={(e) => setEditingPlan({ ...current, monthly_price: parseFloat(e.target.value) || 0 })}
                                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
                                            />
                                        </div>

                                        {/* Credits */}
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">Credits Per Cycle</label>
                                            <input
                                                type="number"
                                                value={current.credits}
                                                disabled={!isEditing}
                                                onChange={(e) => setEditingPlan({ ...current, credits: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
                                            />
                                        </div>

                                        {/* Resume Creation Label */}
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">Resume Creation Label</label>
                                            <input
                                                type="text"
                                                value={current.resume_creation_label}
                                                disabled={!isEditing}
                                                onChange={(e) => setEditingPlan({ ...current, resume_creation_label: e.target.value })}
                                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
                                            />
                                        </div>

                                        {/* AI Optimization */}
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">AI Optimization Level</label>
                                            <input
                                                type="text"
                                                value={current.ai_optimization_label}
                                                disabled={!isEditing}
                                                onChange={(e) => setEditingPlan({ ...current, ai_optimization_label: e.target.value })}
                                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
                                            />
                                        </div>

                                        {/* Templates */}
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">Templates Label</label>
                                            <input
                                                type="text"
                                                value={current.templates_label}
                                                disabled={!isEditing}
                                                onChange={(e) => setEditingPlan({ ...current, templates_label: e.target.value })}
                                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
                                            />
                                        </div>

                                        {/* Support */}
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">Support Level</label>
                                            <input
                                                type="text"
                                                value={current.support_label}
                                                disabled={!isEditing}
                                                onChange={(e) => setEditingPlan({ ...current, support_label: e.target.value })}
                                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
                                            />
                                        </div>
                                    </div>

                                    {/* Feature Toggles */}
                                    <div className="mt-4 flex flex-wrap gap-4">
                                        {[
                                            { key: "has_extension_access", label: "Chrome Extension" },
                                            { key: "has_multi_profile", label: "Multiple Profiles" },
                                            { key: "has_unlimited_resumes", label: "Unlimited Resumes" },
                                            { key: "has_linkedin_optimization", label: "AI LinkedIn Profile Optimization" },
                                            { key: "has_interview_prep", label: "AI Interview Questions Generator" },
                                            { key: "is_popular", label: "Popular Badge" },
                                        ].map(({ key, label }) => (
                                            <label key={key} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={(current as any)[key]}
                                                    disabled={!isEditing}
                                                    onChange={(e) => setEditingPlan({ ...current, [key]: e.target.checked })}
                                                    className="w-4 h-4 rounded bg-black/50 border-white/20 accent-red-500"
                                                />
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Refresh */}
                <div className="flex justify-center pt-4">
                    <button
                        onClick={fetchPlans}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh Plans
                    </button>
                </div>
            </div>
        </div>
    );
}
