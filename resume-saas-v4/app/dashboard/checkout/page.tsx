"use strict";
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, ShieldCheck, CheckCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import PayPal button to avoid SSR issues
const PayPalCheckoutButton = dynamic(() => import('@/components/billing/PayPalCheckoutButton'), { ssr: false });

// Plan Configuration (Duplicate from BillingPage to ensure consistency, ideal to centralize)
const PLANS: any = {
    PRO: {
        name: "Pro",
        price_monthly: 9.99,
        description: "Perfect for active job seekers",
        features: [
            "50 resumes/month",
            "Chrome Extension Access",
            "Multiple Profiles",
            "Advanced AI Optimization",
            "Priority Email Support"
        ]
    },
    PREMIUM: {
        name: "Premium",
        price_monthly: 19.99,
        description: "Unlimited power for professionals",
        features: [
            "Unlimited Resumes",
            "Chrome Extension Access",
            "Multiple Profiles",
            "Premium AI Optimization",
            "Custom Templates",
            "24/7 Priority Support"
        ]
    },
};

const BILLING_CYCLES: any = {
    MONTHLY: { label: "Monthly", discount: 0, months: 1 },
    SEMI_ANNUAL: { label: "6 Months", discount: 10, months: 6 },
    ANNUAL: { label: "Yearly", discount: 20, months: 12 },
};

function CheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const planKey = searchParams.get('plan');
    const cycleKey = searchParams.get('cycle');

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Validate params
    if (!planKey || !cycleKey || !PLANS[planKey] || !BILLING_CYCLES[cycleKey]) {
        return (
            <div className="text-center py-20">
                <h2 className="text-xl font-bold text-red-500">Invalid Checkout Link</h2>
                <Link href="/dashboard/billing" className="text-blue-500 hover:underline mt-4 block">
                    Return to Billing
                </Link>
            </div>
        );
    }

    const plan = PLANS[planKey];
    const cycle = BILLING_CYCLES[cycleKey];

    // Calculate Price
    const basePrice = plan.price_monthly;
    const discount = cycle.discount / 100;
    const months = cycle.months;
    const discountedMonthly = basePrice * (1 - discount);
    const total = (discountedMonthly * months).toFixed(2);

    const handleSuccess = () => {
        setSuccess(true);
        setTimeout(() => {
            router.push('/dashboard/billing');
        }, 3000);
    };

    if (success) {
        return (
            <div className="max-w-md mx-auto mt-10 p-8 bg-green-50/10 border border-green-500/20 rounded-2xl text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
                <p className="text-gray-400">Your subscription has been upgraded.</p>
                <p className="text-sm text-gray-500 mt-4">Redirecting you back to billing...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-20 animate-fade-in">
            <Link href="/dashboard/billing" className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Billing
            </Link>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Order Summary */}
                <div className="space-y-6 animate-slide-in-left delay-100">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Checkout</h1>
                        <p className="text-gray-400">Complete your secure payment to upgrade.</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[var(--primary)]/50 transition-colors duration-300">
                        <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>

                        <div className="flex justify-between items-center py-3 border-b border-white/10">
                            <div>
                                <div className="font-medium text-white">{plan.name} Plan</div>
                                <div className="text-sm text-gray-400">{cycle.label} Billing</div>
                            </div>
                            <div className="text-right">
                                {/* <div className="text-white">${total}</div> */}
                            </div>
                        </div>

                        <div className="flex justify-between items-center py-3 border-b border-white/10">
                            <div className="text-gray-400">Billing Cycle</div>
                            <div className="text-white">{cycle.label}</div>
                        </div>

                        <div className="flex justify-between items-center py-4">
                            <div className="text-lg font-bold text-white">Total</div>
                            <div className="text-2xl font-bold text-[var(--primary)]">${total}</div>
                        </div>

                        <ul className="mt-4 space-y-2">
                            {plan.features.map((feature: string, i: number) => (
                                <li key={i} className="text-sm text-gray-400 flex items-center">
                                    <CheckCircle className="w-3 h-3 text-[var(--primary)] mr-2" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Payment Options */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-fit animate-slide-in-right delay-200 hover:border-[var(--primary)]/50 transition-colors duration-300">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
                        <ShieldCheck className="w-5 h-5 mr-2 text-green-500" />
                        Secure Payment
                    </h3>

                    {/* PayPal Option */}
                    <div className="mb-6">
                        <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                            <h4 className="font-medium text-blue-400 mb-2">Pay with PayPal</h4>
                            <p className="text-sm text-gray-400 mb-4">
                                Securely pay using your PayPal account or Credit Card via PayPal.
                            </p>
                            <PayPalCheckoutButton
                                amount={parseFloat(total)}
                                planType={planKey}
                                billingCycle={cycleKey}
                                onSuccess={handleSuccess}
                                onError={(err) => console.error("PayPal Error:", err)}
                            />
                        </div>
                    </div>

                    {/* Placeholder for future gateways */}
                    {/* <div className="opacity-50 pointer-events-none grayscale">
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between">
                            <span className="text-gray-400">Credit Card (Stripe)</span>
                            <span className="text-xs bg-gray-700 px-2 py-1 rounded">Coming Soon</span>
                        </div>
                    </div> */}

                    <p className="text-center text-xs text-gray-500 mt-6">
                        By proceeding, you agree to our Terms of Service.
                        <br />
                        Your payment information is encrypted and secure.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        }>
            <CheckoutContent />
        </Suspense>
    );
}
