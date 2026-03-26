import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { generateExtensionToken } from "@/lib/extensionAuth";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";

// CORS preflight
export async function OPTIONS() {
    return handleCorsOptions();
}

/**
 * POST /api/extension/auth
 * Login endpoint for the browser extension.
 * Returns a dedicated JWT token (not a NextAuth session).
 *
 * Body: { email: string, password: string }
 * Response: { token, user: { name, email, plan, credits } }
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password } = body;

        // ─── Validate Input ───
        if (!email || !password) {
            return withCors(NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            ));
        }

        // ─── Find User ───
        const user = await db.users.findUnique({
            where: { email: email.toLowerCase().trim() },
        });

        if (!user) {
            return withCors(NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 }
            ));
        }

        // ─── Verify Password ───
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return withCors(NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 }
            ));
        }

        // ─── Check Subscription & Extension Access ───
        const subscription = await db.subscriptions.findFirst({
            where: { user_id: user.id },
        });

        if (!subscription) {
            return withCors(NextResponse.json(
                {
                    error: "No subscription found. Please set up your account first.",
                    upgrade_required: true,
                    plan: "NONE",
                },
                { status: 403 }
            ));
        }

        // Check extension access: first from plan_configs, fallback to subscription flag, fallback to plan_type
        let hasAccess = subscription.has_extension_access;

        if (!hasAccess) {
            // Check the plan_configs table for the actual plan settings
            const planConfig = await db.plan_configs.findUnique({
                where: { plan_type: subscription.plan_type },
            });
            if (planConfig?.has_extension_access) {
                hasAccess = true;
                // Sync the subscription record so future checks are instant
                await db.subscriptions.update({
                    where: { id: subscription.id },
                    data: { has_extension_access: true },
                });
            }
        }

        if (!hasAccess) {
            // Final fallback: PRO and PREMIUM always get extension access
            if (subscription.plan_type === "PRO" || subscription.plan_type === "PREMIUM") {
                hasAccess = true;
                await db.subscriptions.update({
                    where: { id: subscription.id },
                    data: { has_extension_access: true },
                });
            }
        }

        // Block removed so free tier users can proceed and get their token

        // ─── Generate Extension Token ───
        const token = generateExtensionToken(user.id, user.email);

        return withCors(NextResponse.json({
            token,
            user: {
                name: user.full_name,
                email: user.email,
                plan: subscription.plan_type,
                credits_remaining: subscription.credits_remaining,
            },
        }));
    } catch (error) {
        console.error("[EXTENSION_AUTH]", error);
        return withCors(NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        ));
    }
}
