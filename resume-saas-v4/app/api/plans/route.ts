import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Hardcoded defaults in case DB has no plan_configs yet
const FALLBACK_PLANS = [
    {
        plan_type: "FREE", name: "Free", description: "Get started with basic features",
        monthly_price: 0, credits: 3,
        has_extension_access: false, has_multi_profile: false, has_unlimited_resumes: false,
        resume_creation_label: "3 resumes/month", ai_optimization_label: "Basic",
        templates_label: "5 templates", support_label: "Community", is_popular: false,
    },
    {
        plan_type: "PRO", name: "Pro", description: "Perfect for active job seekers",
        monthly_price: 9.99, credits: 50,
        has_extension_access: true, has_multi_profile: true, has_unlimited_resumes: false,
        resume_creation_label: "50 resumes/month", ai_optimization_label: "Advanced",
        templates_label: "All templates", support_label: "Priority Email", is_popular: true,
    },
    {
        plan_type: "PREMIUM", name: "Premium", description: "Unlimited power for professionals",
        monthly_price: 19.99, credits: 100,
        has_extension_access: true, has_multi_profile: true, has_unlimited_resumes: true,
        resume_creation_label: "Unlimited", ai_optimization_label: "Premium + Priority",
        templates_label: "All + Custom", support_label: "24/7 Priority", is_popular: false,
    },
];

// Public: GET plan configs for billing page
export async function GET() {
    try {
        const plans = await db.plan_configs.findMany({
            orderBy: { monthly_price: "asc" },
        });

        if (plans.length === 0) {
            return NextResponse.json(FALLBACK_PLANS);
        }

        return NextResponse.json(plans);
    } catch {
        return NextResponse.json(FALLBACK_PLANS);
    }
}
