import React from 'react';
import styles from './PricingCard.module.css';
import { Check, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { AllowanceRow, FeatureRow } from '@/lib/planCatalog';

export interface PricingCardPlan {
    name: string;
    description: string;
    monthlyPrice: number;
    popular: boolean;
    /** Credit allowances and profile slots, from planAllowances(). */
    allowances: AllowanceRow[];
    /** Everything else the plan includes or leaves out, from planFeatures(). */
    features: FeatureRow[];
}

interface PricingCardProps {
    plan: PricingCardPlan;
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
        if (currency === "INR" && exchangeRate) return `\u20B9${Math.round(usd * exchangeRate).toLocaleString("en-IN")}`;
        return `$${usd % 1 === 0 ? usd : usd.toFixed(2)}`;
    };

    // Calculate price for display
    const isFree = plan.monthlyPrice === 0;
    const priceDisplay = isFree ? "Free" : fmt(plan.monthlyPrice);
    const cycleLabel = isFree ? "forever" :
        billingCycle === "MONTHLY" ? "per month" :
            billingCycle === "ANNUAL" ? "per month \u00B7 billed yearly" : "per month \u00B7 billed every 6 months";

    // Discount info for the current cycle
    const cycleDiscount = billingCycle === "ANNUAL" ? 20 : billingCycle === "SEMI_ANNUAL" ? 10 : 0;
    const showSavings = !isFree && cycleDiscount > 0;
    const isPopular = plan.popular && !isCurrentPlan;

    return (
        <div className={`${styles.cardWrapper} ${themeClass} ${isPopular ? styles.popularCard : ''}`}>
            {isPopular && <div className={styles.popularRibbon}>{"\u2605"} Most Popular</div>}
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

                {/* Allowances: the numbers the plan is bought for */}
                <div className={styles.allowances}>
                    {plan.allowances.map((row) => (
                        <div
                            key={row.key}
                            className={`${styles.allowanceRow} ${row.included ? '' : styles.allowanceMissing}`}
                        >
                            <span className={styles.allowanceAmount} aria-hidden={row.unlimited || !row.included}>
                                {row.amount}
                            </span>
                            <span className={styles.allowanceText}>
                                <span className={styles.allowanceLabel}>{row.label}</span>
                                {row.included && <span className={styles.allowanceDetail}>{row.detail}</span>}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Features */}
                <div className={styles.features}>
                    {plan.features.map((feature) => (
                        <div
                            key={feature.label}
                            className={`${styles.featureRow} ${feature.included ? '' : styles.featureMissing}`}
                        >
                            <div className={styles.iconWrapper}>
                                {feature.included ? (
                                    <Check className={styles.checkIcon} aria-label="Included" />
                                ) : (
                                    <X className={styles.xIcon} aria-label="Not included" />
                                )}
                            </div>
                            <span>{feature.label}</span>
                        </div>
                    ))}
                </div>

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
