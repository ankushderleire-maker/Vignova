import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Last-resort defaults for a database with no plan_configs rows yet.
//
// These used to disagree with prisma/seed-plans.ts, app/api/billing/upgrade
// and app/api/extension/status, so the allowance a user saw depended on which
// screen they were looking at. lib/planLimits.ts is the source of truth now;
// this table exists only so the billing page renders before the table is
// seeded, and is kept in step with it deliberately.
const FALLBACK_PLANS = [
    {
        plan_type: "FREE", name: "Free", description: "Get started with basic features",
        monthly_price: 0, credits: 3,
        tailoring_credits: 3, writing_credits: 3, interview_credits: 1, max_profiles: 1,
        has_extension_access: true, has_multi_profile: false, has_unlimited_resumes: false,
        has_linkedin_optimization: false, has_interview_prep: true,
        resume_creation_label: "3 tailored resumes/month", ai_optimization_label: "Keyword match score",
        templates_label: "5 templates", support_label: "Community", is_popular: false,
    },
    {
        plan_type: "PRO", name: "Pro", description: "Perfect for active job seekers",
        monthly_price: 13.99, credits: 50,
        tailoring_credits: 50, writing_credits: 100, interview_credits: 5, max_profiles: 5,
        has_extension_access: true, has_multi_profile: true, has_unlimited_resumes: false,
        has_linkedin_optimization: true, has_interview_prep: true,
        resume_creation_label: "50 tailored resumes/month", ai_optimization_label: "Advanced ATS Optimization",
        templates_label: "Premium Templates", support_label: "Priority Email", is_popular: true,
    },
    {
        plan_type: "PREMIUM", name: "Premium", description: "Unlimited power for professionals",
        monthly_price: 29.99, credits: -1,
        tailoring_credits: -1, writing_credits: -1, interview_credits: -1, max_profiles: -1,
        has_extension_access: true, has_multi_profile: true, has_unlimited_resumes: true,
        has_linkedin_optimization: true, has_interview_prep: true,
        resume_creation_label: "Unlimited tailored resumes", ai_optimization_label: "Advanced ATS Optimization",
        templates_label: "Premium Templates", support_label: "24/7 Priority Email Support", is_popular: false,
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
