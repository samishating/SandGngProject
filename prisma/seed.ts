// Seeds the plan set and its starting USD prices.
//
// USD is the only stored price — EUR and GBP are derived from ExchangeRate at
// render time (see lib/currency.ts). These amounts are just the starting
// point; the admin edits them at /admin/plans afterwards, and re-running this
// seed will NOT overwrite an edited price. Only missing rows are created.
//
// `dotenv/config` is needed because this also runs standalone via
// `tsx prisma/seed.ts`, which doesn't load .env on its own.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg(process.env.DIRECT_URL || process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

interface PlanSeed {
  key: string;
  name: string;
  isRecurring: boolean;
  /** interval -> starting price in USD cents */
  prices: Record<string, number>;
}

const plans: PlanSeed[] = [
  {
    key: 'one-off',
    name: 'One-off',
    isRecurring: false,
    prices: { one_time: 8900 },
  },
  {
    key: 'household',
    name: 'Household',
    isRecurring: true,
    // Yearly is 10x monthly — two months free.
    prices: { month: 1900, year: 19000 },
  },
  {
    key: 'family-elders',
    name: 'Family & elders',
    isRecurring: true,
    prices: { month: 2900, year: 29000 },
  },
];

async function main() {
  for (const p of plans) {
    const plan = await prisma.plan.upsert({
      where: { key: p.key },
      update: { name: p.name, isRecurring: p.isRecurring },
      create: { key: p.key, name: p.name, isRecurring: p.isRecurring },
    });

    for (const [interval, amountUsd] of Object.entries(p.prices)) {
      const existing = await prisma.planPrice.findUnique({
        where: { planId_interval: { planId: plan.id, interval } },
      });

      if (existing) {
        console.log(`Kept ${p.key} / ${interval} at $${(existing.amountUsd / 100).toFixed(2)} (already set)`);
        continue;
      }

      await prisma.planPrice.create({ data: { planId: plan.id, interval, amountUsd } });
      console.log(`Seeded ${p.key} / ${interval} -> $${(amountUsd / 100).toFixed(2)}`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
