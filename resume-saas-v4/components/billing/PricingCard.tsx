import React from 'react';
import dynamic from 'next/dynamic';
import styles from './PricingCard.module.css';
import { Check, X, Loader2 } from 'lucide-react';

import { useRouter } from 'next/navigation';

interface PricingCardProps {
    plan: any;
    planKey: string;
    billingCycle: string;
    isCurrentPlan: boolean;
    isDowngrade?: boolean;
    currency?: string;
    exchangeRate?: number | null;
    onUpgrade: (planKey: string) => void;
    loading: boolean;
    totalPrice?: number;
}

const FEATURE_LABELS: Record<string, string> = {
    resumeCreation: "Resume Creation",
    extensionAccess: "Chrome Extension Access",
    multiProfile: "Multiple Profiles",
    unlimitedResumes: "Unlimited Resumes",
    aiOptimization: "ATS Optimization",
    linkedinOptimization: "AI LinkedIn Profile Optimization",
    interviewPrep: "AI Interview Generator",
    templates: "Templates",
    support: "Support",
};

export const PricingCard: React.FC<PricingCardProps> = ({
    plan,
    planKey,
    billingCycle,
    isCurrentPlan,
    isDowngrade = false,
    currency = "USD",
    exchangeRate = null,
    onUpgrade,
    loading,
    totalPrice = 0
}) => {
    const router = useRouter();

    // Determine style theme based on plan key
    const themeClass = planKey === 'PREMIUM' ? styles.premium :
        planKey === 'PRO' ? styles.pro :
            styles.free;

    const titleClass = planKey === 'PREMIUM' ? styles.premiumTitle :
        planKey === 'PRO' ? styles.proTitle :
            styles.freeTitle;

    const priceClass = planKey === 'PREMIUM' ? styles.premiumPrice :
        planKey === 'PRO' ? styles.proPrice :
            styles.freePrice;

    const ctaClass = planKey === 'PREMIUM' ? styles.ctaPremium :
        planKey === 'PRO' ? styles.ctaPro :
            styles.ctaFree;

    // Currency-aware formatter
    const fmt = (usd: number) => {
        if (currency === "INR" && exchangeRate) return `₹${Math.round(usd * exchangeRate).toLocaleString("en-IN")}`;
        return `$${usd % 1 === 0 ? usd : usd.toFixed(2)}`;
    };

    // Calculate price for display
    const isFree = plan.monthlyPrice === 0;
    const priceDisplay = isFree ? "Free" : fmt(plan.monthlyPrice);
    const cycleLabel = isFree ? "forever" :
        billingCycle === "MONTHLY" ? "per month" :
            billingCycle === "ANNUAL" ? "per month · billed yearly" : "per month · billed every 6 months";

    // Discount info for the current cycle
    const cycleDiscount = billingCycle === "ANNUAL" ? 20 : billingCycle === "SEMI_ANNUAL" ? 10 : 0;
    const showSavings = !isFree && cycleDiscount > 0;
    const isPopular = plan.popular && !isCurrentPlan;

    return (
        <div className={`${styles.cardWrapper} ${themeClass} ${isPopular ? styles.popularCard : ''}`}>
            {isPopular && <div className={styles.popularRibbon}>★ Most Popular</div>}
            <div className={styles.innerCard}>
                {/* Header */}
                <div className={styles.header}>
                    <h3 className={`${styles.title} ${titleClass}`}>{plan.name}</h3>
                    <p className={styles.description}>{plan.description}</p>
                </div>

                {/* Price */}
                <div className={styles.priceContainer}>
                    {showSavings && (
                        <div className={styles.originalPrice}>{fmt(plan.monthlyPrice / (1 - cycleDiscount / 100))}</div>
                    )}
                    <div className={`${styles.price} ${priceClass}`}>{priceDisplay}</div>
                    <div className={styles.frequency}>{cycleLabel}</div>
                    {!isFree && totalPrice > 0 && billingCycle !== "MONTHLY" && (
                        <div className={styles.totalBilled}>{fmt(totalPrice)} billed today</div>
                    )}
                    {showSavings && (
                        <div className={styles.savingsBadge}>Save {cycleDiscount}%</div>
                    )}
                </div>

                {/* Features */}
                <div className={styles.features}>
                    {Object.entries(plan.features).map(([featureKey, value]) => (
                        <div key={featureKey} className={styles.featureRow}>
                            <div className={styles.iconWrapper}>
                                {typeof value === "boolean" ? (
                                    value ? (
                                        <Check className={styles.checkIcon} />
                                    ) : (
                                        <X className={styles.xIcon} />
                                    )
                                ) : (
                                    <Check className={styles.checkIcon} />
                                )}
                            </div>
                            <span>
                                {typeof value === "boolean" ? FEATURE_LABELS[featureKey] : String(value)}
                            </span>
                        </div>
                    ))}
                </div>

                {/* CTA Button or PayPal */}
                {/* CTA Button */}
                <button
                    className={`${styles.ctaButton} ${ctaClass} ${isCurrentPlan || planKey === "FREE" || loading ? styles.ctaDisabled : ''}`}
                    onClick={() => {
                        if (planKey === "FREE") {
                            onUpgrade(planKey);
                        } else {
                            // Redirect to Checkout Page
                            router.push(`/dashboard/checkout?plan=${planKey}&cycle=${billingCycle}`);
                        }
                    }}
                    disabled={isCurrentPlan || loading}
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                        </>
                    ) : isCurrentPlan ? (
                        "Current Plan"
                    ) : planKey === "FREE" ? (
                        "Default Plan"
                    ) : isDowngrade ? (
                        "Downgrade"
                    ) : (
                        "Upgrade Now"
                    )}
                </button>
            </div>
        </div>
    );
};
