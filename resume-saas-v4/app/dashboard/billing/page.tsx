"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    ArrowUpRight,
    Calendar,
    CheckCircle2,
    CreditCard,
    FileText,
    Gift,
    Loader2,
    MessageSquareQuote,
    Mic,
    Package,
    RefreshCw,
    Rocket,
    ShieldCheck,
    Sparkles,
} from "lucide-react";
import { PricingCard } from "@/components/billing/PricingCard";
import { CustomDialog } from "@/components/ui/CustomDialog";
import {
    BUCKETS,
    BUCKET_DESCRIPTIONS,
    BUCKET_LABELS,
    CREDIT_ACTIONS,
    CREDIT_COSTS,
    FREE_ON_EVERY_PLAN,
    INFINITY_SIGN,
    NONE_SIGN,
    describeCost,
    planAllowances,
    planFeatures,
    type Bucket,
    type CreditCost,
    type PlanConfig,
} from "@/lib/planCatalog";

const BILLING_CYCLES = [
    { id: "MONTHLY", label: "Monthly", discount: 0, months: 1 },
    { id: "SEMI_ANNUAL", label: "6 Months", discount: 10, months: 6 },
    { id: "ANNUAL", label: "Yearly", discount: 20, months: 12 },
];

const PLAN_RANK: Record<string, number> = { FREE: 0, PRO: 1, PREMIUM: 2 };

const BUCKET_ICONS: Record<Bucket, typeof FileText> = {
    tailoring: FileText,
    writing: MessageSquareQuote,
    interview: Mic,
};

type BucketBalance = {
    bucket: Bucket;
    remaining: number;
    total: number;
    unlimited: boolean;
};

interface Subscription {
    plan_type: string;
    expires_at: string | null;
    buckets: BucketBalance[];
    resets_at: string | null;
}

const creditCount = (cost: CreditCost) => BUCKETS.reduce((sum, bucket) => sum + (cost[bucket] ?? 0), 0);

/** Actions that spend from exactly this bucket, for its column. */
const actionsFor = (bucket: Bucket) =>
    CREDIT_ACTIONS.filter(({ action }) => {
        const spends = Object.keys(CREDIT_COSTS[action]);
        return spends.length === 1 && spends[0] === bucket;
    });

/** The pack spends from two buckets, so it gets a row of its own. */
const PACK = CREDIT_ACTIONS.find(({ action }) => action === "applicationPack");
const PACK_SAVING =
    creditCount(CREDIT_COSTS.tailoredResume) +
    creditCount(CREDIT_COSTS.coverLetter) +
    creditCount(CREDIT_COSTS.applicationEmail) -
    creditCount(CREDIT_COSTS.applicationPack);

export default function BillingPage() {
    const [billingCycle, setBillingCycle] = useState("MONTHLY");
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [planConfigs, setPlanConfigs] = useState<PlanConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [billingInfo, setBillingInfo] = useState<{ currency: string; exchange_rate: number | null; country: string } | null>(null);
    const [dialogConfig, setDialogConfig] = useState<{
        isOpen: boolean;
        type: 'alert' | 'confirm';
        title: string;
        description: string;
        variant: 'default' | 'destructive' | 'success';
        confirmText?: string;
        onConfirm?: () => void;
    }>({ isOpen: false, type: 'alert', title: '', description: '', variant: 'default' });

    const fetchSubscription = async () => {
        try {
            const res = await fetch("/api/subscription", { cache: "no-store" });
            const data = await res.json();
            setSubscription({
                plan_type: data.plan_type || "FREE",
                expires_at: data.expires_at ?? null,
                buckets: Array.isArray(data.buckets) ? data.buckets : [],
                resets_at: data.resets_at ?? null,
            });
        } catch (error) {
            console.error("Failed to fetch subscription:", error);
        }
    };

    const fetchPlans = async () => {
        try {
            const res = await fetch("/api/plans");
            const data = await res.json();
            if (Array.isArray(data)) setPlanConfigs(data);
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

    useEffect(() => {
        Promise.all([fetchSubscription(), fetchPlans(), fetchBillingInfo()]).finally(() => setLoading(false));
    }, []);

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
    const currentRank = PLAN_RANK[currentPlan] || 0;
    const currentAllowances = currentPlanConfig ? planAllowances(currentPlanConfig) : [];
    // Periods start at midnight UTC, so the date is read in UTC too. In a
    // timezone behind UTC it would otherwise show the last day of this month.
    const resetsOn = subscription?.resets_at
        ? new Date(subscription.resets_at).toLocaleDateString(undefined, { day: "numeric", month: "long", timeZone: "UTC" })
        : null;

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-slide-down">
            {/* Hero */}
            <div className="text-center max-w-2xl mx-auto pt-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-xs font-semibold mb-4">
                    <Sparkles className="h-3.5 w-3.5" /> Upgrade your job search
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] tracking-tight">
                    Choose the plan that gets you hired
                </h1>
                <p className="text-[var(--text-secondary)] mt-3">
                    Every plan includes three monthly credit allowances: tailoring for resumes, writing for
                    cover letters, emails and LinkedIn, and interview for practice questions. Cancel anytime.
                </p>
            </div>

            {/* Current plan and what is left of each allowance */}
            <section className="bg-gradient-to-br from-[var(--primary)]/10 to-purple-500/10 border border-[var(--primary)]/20 rounded-2xl p-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[var(--primary)]/20 rounded-xl">
                            <CreditCard className="h-6 w-6 text-[var(--primary)]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--foreground)]">
                                Current Plan: <span className="text-[var(--primary)]">{currentPlanConfig?.name || "Free"}</span>
                            </h2>
                            <p className="text-[var(--text-secondary)] text-sm">
                                {resetsOn ? `Credits refresh on ${resetsOn}` : "Credits refresh on the 1st of each month"}
                                {subscription?.expires_at && ` \u00B7 Plan expires ${new Date(subscription.expires_at).toLocaleDateString()}`}
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/dashboard/usage"
                        className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--sidebar-bg)] text-[var(--foreground)] hover:border-[var(--primary)]/50 transition-colors"
                    >
                        View usage <ArrowUpRight className="h-4 w-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                    {BUCKETS.map((bucket) => {
                        const balance = subscription?.buckets.find((b) => b.bucket === bucket);
                        const Icon = BUCKET_ICONS[bucket];
                        const percent = !balance
                            ? 0
                            : balance.unlimited
                              ? 100
                              : balance.total > 0
                                ? Math.round((balance.remaining / balance.total) * 100)
                                : 0;
                        const empty = !!balance && !balance.unlimited && balance.remaining <= 0;
                        const bar = empty ? "bg-rose-500" : !balance?.unlimited && percent <= 20 ? "bg-amber-500" : "bg-emerald-500";
                        return (
                            <div key={bucket} className="rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)]/60 p-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                                    <Icon className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
                                    {BUCKET_LABELS[bucket]}
                                </div>
                                <div className="mt-2 flex items-baseline gap-1.5">
                                    <span className={`text-2xl font-bold tabular-nums ${empty ? "text-rose-500" : "text-[var(--foreground)]"}`}>
                                        {!balance ? NONE_SIGN : balance.unlimited ? INFINITY_SIGN : balance.remaining}
                                    </span>
                                    <span className="text-xs text-[var(--text-secondary)]">
                                        {!balance ? "unavailable" : balance.unlimited ? "unlimited" : `of ${balance.total} left`}
                                    </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-[var(--foreground)]/10 mt-2 overflow-hidden">
                                    <div className={`h-full rounded-full ${bar}`} style={{ width: `${percent}%` }} />
                                </div>
                                <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                                    {currentAllowances.find((row) => row.key === bucket)?.detail ?? BUCKET_DESCRIPTIONS[bucket]}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>

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
                    return (
                        <PricingCard
                            key={pc.plan_type}
                            plan={{
                                name: pc.name,
                                description: pc.description,
                                monthlyPrice: parseFloat(String(pricing.monthly)),
                                // Only the plan flagged in /admin/plans. Premium used to be
                                // marked popular unconditionally too, so two cards wore the
                                // ribbon at once.
                                popular: pc.is_popular,
                                allowances: planAllowances(pc),
                                features: planFeatures(pc),
                            }}
                            planKey={pc.plan_type}
                            billingCycle={billingCycle}
                            isCurrentPlan={currentPlan === pc.plan_type}
                            isDowngrade={(PLAN_RANK[pc.plan_type] || 0) < currentRank}
                            currency={billingInfo?.currency || "USD"}
                            exchangeRate={billingInfo?.exchange_rate}
                            onUpgrade={handleUpgrade}
                            loading={false}
                            totalPrice={parseFloat(String(pricing.total))}
                        />
                    );
                })}
            </div>

            {/* What each allowance pays for */}
            <section aria-labelledby="how-credits-work" className="space-y-5">
                <div className="text-center max-w-2xl mx-auto">
                    <h2 id="how-credits-work" className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
                        How credits work
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-2">
                        Each allowance is spent only by the actions listed under it, so writing a cover letter
                        never uses up a tailored resume.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {BUCKETS.map((bucket) => {
                        const Icon = BUCKET_ICONS[bucket];
                        return (
                            <div key={bucket} className="rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] p-5">
                                <div className="flex items-center gap-2.5">
                                    <span className="rounded-lg bg-[var(--primary)]/15 text-[var(--primary)] p-2">
                                        <Icon className="h-4 w-4" aria-hidden="true" />
                                    </span>
                                    <h3 className="text-base font-semibold text-[var(--foreground)]">{BUCKET_LABELS[bucket]}</h3>
                                </div>
                                <ul className="mt-4 space-y-3">
                                    {actionsFor(bucket).map(({ action, label, detail }) => {
                                        const amount = (CREDIT_COSTS[action] as CreditCost)[bucket] ?? 0;
                                        return (
                                            <li key={action} className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-[var(--foreground)]">{label}</p>
                                                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{detail}</p>
                                                </div>
                                                <span className="shrink-0 text-xs font-semibold text-[var(--primary)] bg-[var(--primary)]/10 rounded-full px-2 py-0.5 whitespace-nowrap">
                                                    {amount} credit{amount === 1 ? "" : "s"}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        );
                    })}
                </div>

                {PACK && (
                    <div className="rounded-2xl border border-[var(--primary)]/25 bg-[var(--primary)]/5 p-5 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <span className="rounded-lg bg-[var(--primary)]/15 text-[var(--primary)] p-2">
                                <Package className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-[var(--foreground)]">{PACK.label}</p>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    {PACK.detail}.
                                    {PACK_SAVING > 0 &&
                                        ` Saves ${PACK_SAVING} credit${PACK_SAVING === 1 ? "" : "s"} compared with generating them one at a time.`}
                                </p>
                            </div>
                        </div>
                        <span className="text-sm font-semibold text-[var(--primary)] bg-[var(--primary)]/10 rounded-full px-3 py-1">
                            {describeCost(CREDIT_COSTS.applicationPack)}
                        </span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] p-5">
                        <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                            <Gift className="h-4 w-4 text-emerald-500" aria-hidden="true" /> Free on every plan
                        </h3>
                        <ul className="mt-3 space-y-2">
                            {FREE_ON_EVERY_PLAN.map((item) => (
                                <li key={item} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" aria-hidden="true" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] p-5">
                        <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" /> Good to know
                        </h3>
                        <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)] list-disc pl-5">
                            <li>Allowances refresh on the 1st of every month (UTC). Unused credits do not roll over.</li>
                            <li>If a generation fails, the credit it reserved is returned automatically.</li>
                            <li>Upgrade mid-month and the new allowance applies straight away, minus what you have already used this month.</li>
                            <li>Unlimited allowances are subject to fair use.</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Trust badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {[
                    { icon: ShieldCheck, title: "Secure payments", desc: "256-bit encrypted via PayPal & Razorpay" },
                    { icon: Rocket, title: "Instant activation", desc: "New allowances apply the moment you pay" },
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
