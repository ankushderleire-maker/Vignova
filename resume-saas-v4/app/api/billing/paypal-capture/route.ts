import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

// ── PayPal API Config ──
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';

// Valid plan types
const VALID_PLAN_TYPES = ['PRO', 'PREMIUM'];
const VALID_BILLING_CYCLES = ['MONTHLY', 'SEMI_ANNUAL', 'ANNUAL'];

// Billing-cycle discounts — must match the billing UI and the backend
// checkout pricing (BILLING_CYCLES in app/dashboard/billing/page.tsx).
const CYCLE_MONTHS: Record<string, number> = { MONTHLY: 1, SEMI_ANNUAL: 6, ANNUAL: 12 };
const CYCLE_DISCOUNT: Record<string, number> = { MONTHLY: 0, SEMI_ANNUAL: 0.1, ANNUAL: 0.2 };
const FALLBACK_MONTHLY_PRICE: Record<string, number> = { PRO: 13.99, PREMIUM: 29.99 };

// Authoritative USD total for a plan + cycle, computed server-side so a
// tampered client "amount" can never buy a plan for less than it costs.
async function expectedUsdTotal(planType: string, billingCycle: string): Promise<number> {
    let monthly = FALLBACK_MONTHLY_PRICE[planType];
    try {
        const cfg = await db.plan_configs.findUnique({ where: { plan_type: planType } });
        if (cfg && typeof cfg.monthly_price === 'number' && cfg.monthly_price > 0) {
            monthly = cfg.monthly_price;
        }
    } catch { /* use fallback */ }
    const months = CYCLE_MONTHS[billingCycle] ?? 1;
    const discount = CYCLE_DISCOUNT[billingCycle] ?? 0;
    return Number((monthly * (1 - discount) * months).toFixed(2));
}

/**
 * Verify a PayPal order server-side by calling PayPal's API
 */
async function verifyPayPalOrder(orderID: string): Promise<{ verified: boolean; amount?: number; currency?: string }> {
    // Never grant a plan without a real server-side verification. If the
    // credentials are missing we FAIL CLOSED rather than trusting the client.
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
        console.error('[PAYPAL_CAPTURE] PayPal credentials not configured — refusing to grant plan. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.');
        return { verified: false };
    }

    try {
        // Step 1: Get access token
        const authResponse = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });

        if (!authResponse.ok) {
            console.error('[PAYPAL_CAPTURE] Failed to get PayPal access token');
            return { verified: false };
        }

        const { access_token } = await authResponse.json();

        // Step 2: Get order details
        const orderResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${encodeURIComponent(orderID)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!orderResponse.ok) {
            console.error('[PAYPAL_CAPTURE] Failed to fetch PayPal order details');
            return { verified: false };
        }

        let orderData = await orderResponse.json();

        // Step 3: An APPROVED order has been authorized by the buyer but the
        // money has NOT been taken yet — we must capture it server-side.
        // Only a COMPLETED capture means funds actually moved.
        if (orderData.status === 'APPROVED') {
            const captureResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!captureResponse.ok) {
                console.error('[PAYPAL_CAPTURE] Failed to capture PayPal order');
                return { verified: false };
            }
            orderData = await captureResponse.json();
        }

        if (orderData.status !== 'COMPLETED') {
            console.error(`[PAYPAL_CAPTURE] Order status is ${orderData.status}, not COMPLETED`);
            return { verified: false };
        }

        // Extract the amount that was actually captured.
        const capture = orderData.purchase_units?.[0]?.payments?.captures?.[0];
        const amount = parseFloat(
            capture?.amount?.value ?? orderData.purchase_units?.[0]?.amount?.value ?? '0'
        );
        const currency = capture?.amount?.currency_code
            ?? orderData.purchase_units?.[0]?.amount?.currency_code
            ?? 'USD';

        return { verified: true, amount, currency };
    } catch (error) {
        console.error('[PAYPAL_CAPTURE] Verification error:', error);
        return { verified: false };
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { orderID, planType, billingCycle } = await req.json();

        // Validate required fields
        if (!orderID || !planType || !billingCycle) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Validate plan type and billing cycle
        if (!VALID_PLAN_TYPES.includes(planType)) {
            return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 });
        }
        if (!VALID_BILLING_CYCLES.includes(billingCycle)) {
            return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 });
        }

        // Sanitize orderID (only allow alphanumeric and dashes)
        if (!/^[a-zA-Z0-9-]+$/.test(orderID)) {
            return NextResponse.json({ error: 'Invalid order ID format' }, { status: 400 });
        }

        // ── SERVER-SIDE PAYPAL VERIFICATION ──
        const paypalResult = await verifyPayPalOrder(orderID);
        if (!paypalResult.verified) {
            return NextResponse.json({ error: 'Payment verification failed. Please contact support.' }, { status: 402 });
        }

        // ── AMOUNT VALIDATION ──
        // The buyer must have actually paid at least what the plan costs.
        // PayPal is charged in USD, so compare against the USD total.
        const expected = await expectedUsdTotal(planType, billingCycle);
        const paid = paypalResult.amount ?? 0;
        if ((paypalResult.currency || 'USD') !== 'USD' || paid + 0.01 < expected) {
            console.error(`[PAYPAL_CAPTURE] Amount mismatch: paid ${paid} ${paypalResult.currency}, expected ${expected} USD`);
            return NextResponse.json({ error: 'Payment amount does not match plan price.' }, { status: 402 });
        }

        const user = await db.users.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check for duplicate transaction
        const existingPayment = await db.payment.findFirst({
            where: { transactionId: orderID },
        });
        if (existingPayment) {
            return NextResponse.json({ error: 'This transaction has already been processed' }, { status: 409 });
        }

        // Fetch plan config from DB (with fallback)
        let credits = 3, creditsTotal = 3;
        let hasExtensionAccess = false, hasMultiProfile = false, hasUnlimitedResumes = false;

        try {
            const planConfig = await db.plan_configs.findUnique({ where: { plan_type: planType } });
            if (planConfig) {
                credits = planConfig.credits;
                creditsTotal = planConfig.credits;
                hasExtensionAccess = planConfig.has_extension_access;
                hasMultiProfile = planConfig.has_multi_profile;
                hasUnlimitedResumes = planConfig.has_unlimited_resumes;
            } else {
                // Fallback for missing DB config
                if (planType === 'PRO') {
                    credits = 50; creditsTotal = 50;
                    hasExtensionAccess = true; hasMultiProfile = true;
                } else if (planType === 'PREMIUM') {
                    credits = 1000000; creditsTotal = 1000000;
                    hasExtensionAccess = true; hasMultiProfile = true; hasUnlimitedResumes = true;
                }
            }
        } catch {
            // Use defaults if DB query fails
            if (planType === 'PRO') {
                credits = 50; creditsTotal = 50;
                hasExtensionAccess = true; hasMultiProfile = true;
            } else if (planType === 'PREMIUM') {
                credits = 1000000; creditsTotal = 1000000;
                hasExtensionAccess = true; hasMultiProfile = true; hasUnlimitedResumes = true;
            }
        }

        // Calculate expiration date
        const now = new Date();
        const expiresAt = new Date(now);
        if (billingCycle === 'MONTHLY') {
            expiresAt.setMonth(expiresAt.getMonth() + 1);
        } else if (billingCycle === 'SEMI_ANNUAL') {
            expiresAt.setMonth(expiresAt.getMonth() + 6);
        } else if (billingCycle === 'ANNUAL') {
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        }

        // 1. Update/Upsert Subscription
        const subscription = await db.subscriptions.upsert({
            where: { user_id: user.id },
            update: {
                plan_type: planType,
                billing_cycle: billingCycle,
                credits_remaining: credits,
                credits_total: creditsTotal,
                has_extension_access: hasExtensionAccess,
                has_multi_profile: hasMultiProfile,
                has_unlimited_resumes: hasUnlimitedResumes,
                starts_at: now,
                expires_at: expiresAt,
                updated_at: now
            },
            create: {
                user_id: user.id,
                plan_type: planType,
                billing_cycle: billingCycle,
                credits_remaining: credits,
                credits_total: creditsTotal,
                has_extension_access: hasExtensionAccess,
                has_multi_profile: hasMultiProfile,
                has_unlimited_resumes: hasUnlimitedResumes,
                starts_at: now,
                expires_at: expiresAt
            }
        });

        // 2. Log Payment with verified amount
        await db.payment.create({
            data: {
                userId: user.id,
                amount: paypalResult.amount || 0,
                currency: paypalResult.currency || 'USD',
                status: 'COMPLETED',
                paymentMethod: 'PAYPAL',
                transactionId: orderID,
                planType: planType,
                billingCycle: billingCycle
            }
        });

        return NextResponse.json({ success: true, subscription });

    } catch (error) {
        console.error('PayPal Capture Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
