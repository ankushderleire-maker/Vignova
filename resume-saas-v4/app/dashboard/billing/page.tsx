"use client";

import { useState, useEffect } from "react";
import {
    Check,
    X,
    Zap,
    Crown,
    Sparkles,
    Loader2,
    CreditCard,
    Calendar
} from "lucide-react";
import { PricingCard } from "@/components/billing/PricingCard";
import { CustomDialog } from "@/components/ui/CustomDialog";

// Icons mapped by plan type
const PLAN_ICONS: Record<string, any> = { FREE: Zap, PRO: Crown, PREMIUM: Sparkles };
const PLAN_COLORS: Record<string, { color: string; gradient: string }> = {
    FREE: { color: "gray", gradient: "from-gray-500/20 to-gray-600/20" },
    PRO: { color: "primary", gradient: "from-[var(--primary)]/20 to-purple-500/20" },
    PREMIUM: { color: "yellow", gradient: "from-yellow-500/20 to-orange-500/20" },
};

const BILLING_CYCLES = [
    { id: "MONTHLY", label: "Monthly", discount: 0, months: 1 },
    { id: "SEMI_ANNUAL", label: "6 Months", discount: 10, months: 6 },
    { id: "ANNUAL", label: "Yearly", discount: 20, months: 12 },
];

interface PlanConfig {
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


interface Subscription {
    plan_type: string;
    billing_cycle: string;
    credits_remaining: number;
    credits_total: number;
    expires_at: string | null;
    has_extension_access: boolean;
    has_multi_profile: boolean;
    has_unlimited_resumes: boolean;
}

export default function BillingPage() {
    const [billingCycle, setBillingCycle] = useState("MONTHLY");
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [planConfigs, setPlanConfigs] = useState<PlanConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState<string | null>(null);
    const [dialogConfig, setDialogConfig] = useState<{
        isOpen: boolean;
        type: 'alert' | 'confirm';
        title: string;
        description: string;
        variant: 'default' | 'destructive' | 'success';
        confirmText?: string;
        onConfirm?: () => void;
    }>({ isOpen: false, type: 'alert', title: '', description: '', variant: 'default' });

    useEffect(() => {
        Promise.all([fetchSubscription(), fetchPlans()]).finally(() => setLoading(false));
    }, []);

    const fetchSubscription = async () => {
        try {
            const res = await fetch("/api/subscription");
            const data = await res.json();
            setSubscription(data);
        } catch (error) {
            console.error("Failed to fetch subscription:", error);
        }
    };

    const fetchPlans = async () => {
        try {
            const res = await fetch("/api/plans");
            const data = await res.json();
            setPlanConfigs(data);
        } catch (error) {
            console.error("Failed to fetch plans:", error);
        }
    };

    const calculatePrice = (basePrice: number, cycle: string) => {
        const cycleInfo = BILLING_CYCLES.find((c) => c.id === cycle);
        if (!cycleInfo || basePrice === 0) return { total: 0, monthly: 0, savings: 0 };

        const discount = cycleInfo.discount / 100;
        const months = cycleInfo.months;
        const discountedMonthly = basePrice * (1 - discount);
        const total = discountedMonthly * months;
        const savings = basePrice * months - total;

        return {
            total: total.toFixed(2),
            monthly: discountedMonthly.toFixed(2),
            savings: savings.toFixed(2),
        };
    };

    const handlePaymentSuccess = async (planKey: string) => {
        await fetchSubscription();
        const planConfig = planConfigs.find(p => p.plan_type === planKey);
        setDialogConfig({
            isOpen: true,
            type: 'alert',
            title: 'Upgrade Successful',
            description: `Successfully upgraded to ${planConfig?.name || planKey} plan!`,
            variant: 'success'
        });
    };

    const handleUpgrade = async (planType: string) => {
        if (planType === "FREE") return;
        handlePaymentSuccess(planType);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    const currentPlan = subscription?.plan_type || "FREE";
    const currentPlanConfig = planConfigs.find(p => p.plan_type === currentPlan);

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-slide-down">
            {/* Current Plan Summary */}
            <div className="bg-gradient-to-br from-[var(--primary)]/10 to-purple-500/10 border border-[var(--primary)]/20 rounded-2xl p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[var(--primary)]/20 rounded-xl">
                            <CreditCard className="h-6 w-6 text-[var(--primary)]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--foreground)]">
                                Current Plan: <span className="text-[var(--primary)]">{currentPlanConfig?.name || "Free"}</span>
                            </h2>
                            <p className="text-[var(--text-secondary)] text-sm">
                                {subscription?.credits_remaining || 0} / {currentPlanConfig?.credits || subscription?.credits_total || 3} credits remaining
                            </p>
                        </div>
                    </div>
                    {subscription?.expires_at && (
                        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                            <Calendar className="h-4 w-4" />
                            Expires: {new Date(subscription.expires_at).toLocaleDateString()}
                        </div>
                    )}
                </div>
            </div>

            {/* Billing Cycle Toggle */}
            <div className="flex justify-center">
                <div className="inline-flex bg-white/5 rounded-xl p-1 border border-white/10">
                    {BILLING_CYCLES.map((cycle) => (
                        <button
                            key={cycle.id}
                            onClick={() => setBillingCycle(cycle.id)}
                            className={`relative px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${billingCycle === cycle.id
                                ? "bg-[var(--primary)] text-white shadow-[0_4px_14px_rgba(var(--primary),0.3)]"
                                : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"
                                }`}
                        >
                            {cycle.label}
                            {cycle.discount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                    -{cycle.discount}%
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Pricing Cards */}
            <div className="flex flex-wrap justify-center gap-8">
                {planConfigs.map((pc) => {
                    const pricing = calculatePrice(pc.monthly_price, billingCycle);
                    const isCurrentPlan = currentPlan === pc.plan_type;
                    const colors = PLAN_COLORS[pc.plan_type] || PLAN_COLORS.FREE;

                    const displayPlan = {
                        name: pc.name,
                        description: pc.description,
                        credits: pc.credits,
                        monthlyPrice: parseFloat(String(pricing.monthly)),
                        features: {
                            resumeCreation: pc.resume_creation_label || `${pc.credits} resumes/month`,
                            extensionAccess: pc.has_extension_access,
                            multiProfile: pc.has_multi_profile,
                            unlimitedResumes: pc.has_unlimited_resumes,
                            aiOptimization: pc.ai_optimization_label,
                            linkedinOptimization: pc.has_linkedin_optimization,
                            interviewPrep: pc.has_interview_prep,
                            templates: pc.templates_label,
                            support: pc.support_label,
                        },
                        icon: PLAN_ICONS[pc.plan_type] || Zap,
                        color: colors.color,
                        gradient: colors.gradient,
                        popular: pc.is_popular,
                    };

                    return (
                        <PricingCard
                            key={pc.plan_type}
                            plan={displayPlan}
                            planKey={pc.plan_type}
                            billingCycle={billingCycle}
                            isCurrentPlan={isCurrentPlan}
                            onUpgrade={handleUpgrade}
                            loading={upgrading === pc.plan_type}
                            totalPrice={parseFloat(String(pricing.total))}
                        />
                    );
                })}
            </div>

            {/* Payment Gateway Notice */}
            <div className="text-center text-[var(--text-secondary)] text-sm">
                <p>🔒 Secured by Data Privacy</p>
            </div>

            <CustomDialog
                {...dialogConfig}
                onClose={() => setDialogConfig(s => ({ ...s, isOpen: false }))}
            />
        </div>
    );
}
