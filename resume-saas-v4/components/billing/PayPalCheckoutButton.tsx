"use strict";
import React, { useState } from 'react';
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { Loader2 } from 'lucide-react';

interface PayPalCheckoutButtonProps {
    amount: number;
    planType: string;
    billingCycle: string;
    onSuccess: () => void;
    onError: (error: any) => void;
}

const PayPalCheckoutButton: React.FC<PayPalCheckoutButtonProps> = ({
    amount,
    planType,
    billingCycle,
    onSuccess,
    onError
}) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleApprove = async (data: any, actions: any) => {
        setIsProcessing(true);
        try {
            // Capture the funds from the transaction
            // For security, it is often recommended to capture on the server
            // But client-side capture is also supported. 
            // We will use the orderID to verify on the backend.

            const response = await fetch('/api/billing/paypal-capture', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderID: data.orderID,
                    planType,
                    billingCycle
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Payment verification failed');
            }

            onSuccess();
        } catch (error) {
            console.error("PayPal Capture Error:", error);
            onError(error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="w-full relative z-0">
            {isProcessing && (
                <div className="absolute inset-0 z-10 bg-white/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
            )}
            <PayPalScriptProvider options={{
                clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test",
                currency: "USD",
                intent: "capture"
            }}>
                <PayPalButtons
                    style={{ layout: "horizontal", label: "pay", height: 40, tagline: false }}
                    createOrder={(data, actions) => {
                        return actions.order.create({
                            intent: "CAPTURE",
                            purchase_units: [
                                {
                                    amount: {
                                        currency_code: "USD",
                                        value: amount.toString(),
                                    },
                                    description: `${planType} Plan - ${billingCycle}`,
                                },
                            ],
                        });
                    }}
                    onApprove={handleApprove}
                    onError={(err) => {
                        console.error("PayPal Button Error:", err);
                        onError(err);
                    }}
                />
            </PayPalScriptProvider>
        </div>
    );
};

export default PayPalCheckoutButton;
