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
    Calendar,
    ShieldCheck,
    RefreshCw,
    Rocket
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
    const [billingInfo, setBillingInfo] = useState<{ currency: string; exchange_rate: number | null; country: string } | null>(null);
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
        Promise.all([fetchSubscription(), fetchPlans(), fetchBillingInfo()]).finally(() => setLoading(false));
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

    const fetchBillingInfo = async () => {
        try {
            const res = await fetch('/api/razorpay/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount_usd: 1 })
            });
            const data = await res.json();
            setBillingInfo({ currency: data.currency, exchange_rate: data.exchange_rate, country: data.country });
        } catch (e) {
            console.error("Failed to fetch billing info:", e);
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

    const PLAN_RANK: Record<string, number> = { FREE: 0, PRO: 1, PREMIUM: 2 };
    const currentRank = PLAN_RANK[currentPlan] || 0;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-slide-down">
            {/* Hero */}
            <div className="text-center max-w-2xl mx-auto pt-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-xs font-semibold mb-4">
                    <Sparkles className="h-3.5 w-3.5" /> Upgrade your job search
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] tracking-tight">
                    Choose the plan that gets you hired
                </h1>
                <p className="text-[var(--text-secondary)] mt-3">
                    Unlock AI resume optimization, unlimited applications, and premium templates. Cancel anytime.
                </p>
            </div>

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
                    const isDowngrade = (PLAN_RANK[pc.plan_type] || 0) < currentRank;
                    const colors = PLAN_COLORS[pc.plan_type] || PLAN_COLORS.FREE;

                    const displayPlan = {
                        name: pc.name,
                        description: pc.description,
                        credits: pc.credits,
                        monthlyPrice: parseFloat(String(pricing.monthly)),
                        popular: pc.plan_type === 'PREMIUM' || pc.is_popular,
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
                    };

                    return (
                        <PricingCard
                            key={pc.plan_type}
                            plan={displayPlan}
                            planKey={pc.plan_type}
                            billingCycle={billingCycle}
                            isCurrentPlan={isCurrentPlan}
                            isDowngrade={isDowngrade}
                            currency={billingInfo?.currency || "USD"}
                            exchangeRate={billingInfo?.exchange_rate}
                            onUpgrade={handleUpgrade}
                            loading={upgrading === pc.plan_type}
                            totalPrice={parseFloat(String(pricing.total))}
                        />
                    );
                })}
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto pt-4">
                {[
                    { icon: ShieldCheck, title: "Secure payments", desc: "256-bit encrypted via PayPal & Razorpay" },
                    { icon: Rocket, title: "Instant activation", desc: "Credits added the moment you pay" },
                    { icon: RefreshCw, title: "Cancel anytime", desc: "No lock-in, downgrade whenever you want" },
                ].map((b) => (
                    <div key={b.title} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="p-2 rounded-lg bg-[var(--primary)]/15 text-[var(--primary)]">
                            <b.icon className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-[var(--foreground)]">{b.title}</div>
                            <div className="text-xs text-[var(--text-secondary)]">{b.desc}</div>
                        </div>
                    </div>
                ))}
            </div>

            <CustomDialog
                {...dialogConfig}
                onClose={() => setDialogConfig(s => ({ ...s, isOpen: false }))}
            />
        </div>
    );
}
