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
        monthly_price: 9.99,
        credits: 50,
        has_extension_access: true,
        has_multi_profile: true,
        has_unlimited_resumes: false,
        resume_creation_label: "50 resumes/month",
        ai_optimization_label: "Advanced",
        templates_label: "All templates",
        support_label: "Priority Email",
        is_popular: true,
    },
    {
        plan_type: "PREMIUM",
        name: "Premium",
        description: "Unlimited power for professionals",
        monthly_price: 19.99,
        credits: 100,
        has_extension_access: true,
        has_multi_profile: true,
        has_unlimited_resumes: true,
        resume_creation_label: "Unlimited",
        ai_optimization_label: "Premium + Priority",
        templates_label: "All + Custom",
        support_label: "24/7 Priority",
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
