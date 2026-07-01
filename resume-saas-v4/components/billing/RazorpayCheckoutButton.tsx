"use client";

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Script from 'next/script';

interface RazorpayCheckoutButtonProps {
    amountUsd: number;
    country: string;
    planType: string;
    billingCycle: string;
    onSuccess: () => void;
    onError: (error: any) => void;
    disabled?: boolean;
}

export default function RazorpayCheckoutButton({ amountUsd, country, planType, billingCycle, onSuccess, onError, disabled }: RazorpayCheckoutButtonProps) {
    const [loading, setLoading] = useState(false);

    const handlePayment = async () => {
        try {
            setLoading(true);

            // 1. Create order on our backend
            const orderResponse = await fetch('/api/razorpay/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount_usd: amountUsd,
                    country: country,
                    plan_type: planType,
                    billing_cycle: billingCycle,
                })
            });

            const orderData = await orderResponse.json();

            if (!orderResponse.ok) {
                throw new Error(orderData.error || 'Failed to create order');
            }

            // 2. Open Razorpay Checkout Modal
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Vignova",
                description: `Upgrade to ${planType} plan (${billingCycle})`,
                order_id: orderData.order_id,
                handler: async function (response: any) {
                    // 3. Verify Payment Signature
                    try {
                        const verifyResponse = await fetch('/api/razorpay/verify-payment', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature,
                                product_id: planType,
                                billing_cycle: billingCycle,
                                country: orderData.country,
                                usd_price: orderData.original_usd,
                                exchange_rate_used: orderData.exchange_rate,
                                final_amount: orderData.amount / 100, // convert paise back to standard
                                currency: orderData.currency
                            })
                        });

                        const verifyData = await verifyResponse.json();

                        if (verifyResponse.ok && verifyData.success) {
                            onSuccess();
                        } else {
                            throw new Error(verifyData.error || "Payment verification failed");
                        }
                    } catch (err) {
                        onError(err);
                    }
                },
                prefill: {
                    name: "",
                    email: "",
                    contact: ""
                },
                theme: {
                    color: "#4f46e5" // matches indigo-600
                }
            };

            const rzp = new (window as any).Razorpay(options);
            
            rzp.on('payment.failed', function (response: any) {
                onError(response.error);
            });
            
            rzp.open();

        } catch (err) {
            onError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
            <button
                onClick={handlePayment}
                disabled={loading || disabled}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
            >
                {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing...</>
                ) : (
                    "Pay with Razorpay"
                )}
            </button>
        </>
    );
}
