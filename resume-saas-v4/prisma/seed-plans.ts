import { PrismaClient } from '@prisma/client';
import { DEFAULT_PLANS } from '../lib/planCatalog';

const prisma = new PrismaClient();

// The plans live in lib/planCatalog.ts, shared with the admin "Seed Default
// Plans" button and the runtime fallbacks, so all of them agree.
async function main() {
    console.log("Seeding plan configs...");
    for (const plan of DEFAULT_PLANS) {
        await prisma.plan_configs.upsert({
            where: { plan_type: plan.plan_type },
            update: plan,
            create: plan,
        });
        console.log(`  - ${plan.plan_type}`);
    }
    console.log("Done!");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
