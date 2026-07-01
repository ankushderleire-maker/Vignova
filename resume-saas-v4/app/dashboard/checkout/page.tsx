"use strict";
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, ShieldCheck, CheckCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import PayPal button to avoid SSR issues
const PayPalCheckoutButton = dynamic(() => import('@/components/billing/PayPalCheckoutButton'), { ssr: false });
const RazorpayCheckoutButton = dynamic(() => import('@/components/billing/RazorpayCheckoutButton'), { ssr: false });

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
    const [previewData, setPreviewData] = useState<any>(null);
    const [previewLoading, setPreviewLoading] = useState(true);
    const [selectedCountry, setSelectedCountry] = useState<string>('');
    const [planConfigs, setPlanConfigs] = useState<any[]>([]);
    const [plansLoading, setPlansLoading] = useState(true);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const res = await fetch("/api/plans");
                const data = await res.json();
                setPlanConfigs(data);
            } catch (error) {
                console.error("Failed to fetch plans:", error);
            } finally {
                setPlansLoading(false);
            }
        };
        fetchPlans();
    }, []);

    // Validate params
    const cycle = cycleKey ? BILLING_CYCLES[cycleKey] : null;
    const plan = planConfigs.find(p => p.plan_type === planKey);

    useEffect(() => {
        if (!plan || !cycle) return;

        const basePrice = plan.monthly_price;
        const discount = cycle.discount / 100;
        const months = cycle.months;
        const discountedMonthly = basePrice * (1 - discount);
        const total = (discountedMonthly * months).toFixed(2);

        const fetchPreview = async () => {
            setPreviewLoading(true);
            try {
                const res = await fetch('/api/razorpay/preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount_usd: parseFloat(total),
                        country: selectedCountry || undefined
                    })
                });
                const data = await res.json();
                if (res.ok) {
                    setPreviewData(data);
                    if (!selectedCountry && data.country) {
                        setSelectedCountry(data.country);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch preview:", err);
            } finally {
                setPreviewLoading(false);
            }
        };

        if (total) {
            fetchPreview();
        }
    }, [plan, cycle, selectedCountry]);

    if (plansLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    if (!planKey || !cycleKey || !plan || !cycle) {
        return (
            <div className="text-center py-20">
                <h2 className="text-xl font-bold text-red-500">Invalid Checkout Link</h2>
                <Link href="/dashboard/billing" className="text-blue-500 hover:underline mt-4 block">
                    Return to Billing
                </Link>
            </div>
        );
    }

    const basePrice = plan.monthly_price;
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
                            <div className="text-lg font-bold text-white">Total USD</div>
                            <div className="text-2xl font-bold text-[var(--primary)]">${total}</div>
                        </div>

                        {/* Country and Exchange Rate Section */}
                        <div className="mt-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                            <label className="block text-sm font-medium text-gray-400 mb-2">Billing Country</label>
                            <select
                                value={selectedCountry}
                                onChange={(e) => setSelectedCountry(e.target.value)}
                                className="w-full bg-[#111111] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none mb-3"
                            >
                                <option value="US">United States</option>
                                <option value="IN">India</option>
                                <option value="GB">United Kingdom</option>
                                <option value="CA">Canada</option>
                                <option value="AU">Australia</option>
                                <option value="IE">Ireland</option>
                            </select>

                            {previewLoading ? (
                                <div className="text-sm text-gray-500 flex items-center">
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Calculating local price...
                                </div>
                            ) : previewData && previewData.currency !== 'USD' ? (
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between text-gray-400">
                                        <span>Exchange Rate</span>
                                        <span>1 USD = {previewData.exchange_rate} {previewData.currency}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-white pt-2 border-t border-white/10">
                                        <span>Final Amount</span>
                                        <span className="text-[var(--primary)]">
                                            {previewData.currency === 'INR' ? '₹' : ''}
                                            {previewData.final_amount.toFixed(2)} {previewData.currency}
                                        </span>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <ul className="mt-4 space-y-2">
                            <li className="text-sm text-gray-400 flex items-center">
                                <CheckCircle className="w-3 h-3 text-[var(--primary)] mr-2" />
                                {plan.resume_creation_label || `${plan.credits} resumes/month`}
                            </li>
                            <li className="text-sm text-gray-400 flex items-center">
                                <CheckCircle className="w-3 h-3 text-[var(--primary)] mr-2" />
                                {plan.ai_optimization_label || "Basic AI Optimization"}
                            </li>
                            <li className="text-sm text-gray-400 flex items-center">
                                <CheckCircle className="w-3 h-3 text-[var(--primary)] mr-2" />
                                {plan.templates_label || "Standard Templates"}
                            </li>
                            <li className="text-sm text-gray-400 flex items-center">
                                <CheckCircle className="w-3 h-3 text-[var(--primary)] mr-2" />
                                {plan.support_label || "Standard Support"}
                            </li>
                            {plan.has_extension_access && (
                                <li className="text-sm text-gray-400 flex items-center">
                                    <CheckCircle className="w-3 h-3 text-[var(--primary)] mr-2" />
                                    Chrome Extension Access
                                </li>
                            )}
                            {plan.has_multi_profile && (
                                <li className="text-sm text-gray-400 flex items-center">
                                    <CheckCircle className="w-3 h-3 text-[var(--primary)] mr-2" />
                                    Multiple Profiles
                                </li>
                            )}
                            {plan.has_unlimited_resumes && (
                                <li className="text-sm text-gray-400 flex items-center">
                                    <CheckCircle className="w-3 h-3 text-[var(--primary)] mr-2" />
                                    Unlimited Resumes
                                </li>
                            )}
                            {plan.has_linkedin_optimization && (
                                <li className="text-sm text-gray-400 flex items-center">
                                    <CheckCircle className="w-3 h-3 text-[var(--primary)] mr-2" />
                                    LinkedIn Optimization
                                </li>
                            )}
                            {plan.has_interview_prep && (
                                <li className="text-sm text-gray-400 flex items-center">
                                    <CheckCircle className="w-3 h-3 text-[var(--primary)] mr-2" />
                                    Interview Prep
                                </li>
                            )}
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

                    {/* Razorpay Option */}
                    <div className="mb-6">
                        <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-lg p-4 mb-4">
                            <h4 className="font-medium text-indigo-400 mb-2">Pay with Razorpay</h4>
                            <p className="text-sm text-gray-400 mb-4">
                                Securely pay using Credit/Debit Cards, UPI, or Netbanking via Razorpay.
                            </p>
                            <RazorpayCheckoutButton
                                amountUsd={parseFloat(total)}
                                country={selectedCountry}
                                planType={planKey}
                                billingCycle={cycleKey}
                                onSuccess={handleSuccess}
                                onError={(err) => console.error("Razorpay Error:", err)}
                                disabled={previewLoading}
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
