import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

async function main() {
    console.log("Seeding plan configs...");
    for (const plan of defaultPlans) {
        await prisma.plan_configs.upsert({
            where: { plan_type: plan.plan_type },
            update: plan,
            create: plan,
        });
        console.log(`  ✓ ${plan.plan_type}`);
    }
    console.log("Done!");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
