import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.users.findMany({
        select: { id: true, email: true, full_name: true }
    });

    const jobs = await prisma.jobApplication.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, userId: true, jobTitle: true, company: true, source: true, createdAt: true }
    });

    const jobsCount = await prisma.jobApplication.count();

    fs.writeFileSync('db_output.json', JSON.stringify({ users, jobs, jobsCount }, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
