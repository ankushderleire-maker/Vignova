import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

const defaultPlans = [
    {
        plan_type: "FREE",
        name: "Free",
        description: "Get started with basic features",
        monthly_price: 0,
        credits: 3,
        has_extension_access: false,
        has_multi_profile: false,
        has_unlimited_resumes: false,
        has_linkedin_optimization: false,
        has_interview_prep: false,
        resume_creation_label: "3 resumes/month",
        ai_optimization_label: "Basic",
        templates_label: "5 templates",
        support_label: "Community",
        is_popular: false,
    },
    {
        plan_type: "PRO",
        name: "Pro",
        description: "Perfect for active job seekers",
        monthly_price: 13.99,
        credits: 40,
        has_extension_access: true,
        has_multi_profile: true,
        has_unlimited_resumes: false,
        has_linkedin_optimization: true,
        has_interview_prep: true,
        resume_creation_label: "40 resumes/month",
        ai_optimization_label: "Advanced ATS Optimization",
        templates_label: "Premium Templates",
        support_label: "Priority Email",
        is_popular: true,
    },
    {
        plan_type: "PREMIUM",
        name: "Premium",
        description: "Unlimited power for professionals",
        monthly_price: 29.99,
        credits: 150,
        has_extension_access: true,
        has_multi_profile: true,
        has_unlimited_resumes: true,
        has_linkedin_optimization: true,
        has_interview_prep: true,
        resume_creation_label: "150 resumes/month",
        ai_optimization_label: "Advanced ATS Optimization",
        templates_label: "Premium Templates",
        support_label: "24/7 Priority Email Support",
        is_popular: false,
    },
];

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        const user = await db.users.findUnique({ where: { email: session.user.email } });
        if (user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        for (const plan of defaultPlans) {
            await db.plan_configs.upsert({
                where: { plan_type: plan.plan_type },
                update: plan,
                create: plan,
            });
        }
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
