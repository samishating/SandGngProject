// Seeds Plan + PlanPrice rows from Stripe Price IDs in env vars. Runtime
// code reads price IDs from Postgres afterward, so switching Stripe test
// <-> live only requires re-running this seed.
//
// `dotenv/config` is needed here because this file also runs standalone via
// `tsx prisma/seed.ts` (the `npm run prisma:seed` script), which — unlike
// `next dev`/`next build` or the Prisma CLI's own config loading — doesn't
// load .env on its own.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg(process.env.DIRECT_URL || process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

interface PriceSeed {
  currency: 'usd' | 'eur';
  interval: 'one_time' | 'month' | 'year';
  envVar: string;
  unitAmount: number; // cents
}

interface PlanSeed {
  key: string;
  name: string;
  isRecurring: boolean;
  prices: PriceSeed[];
}

const plans: PlanSeed[] = [
  {
    key: 'one-off',
    name: 'One-off',
    isRecurring: false,
    prices: [
      { currency: 'usd', interval: 'one_time', envVar: 'STRIPE_PRICE_ONEOFF_USD', unitAmount: 8900 },
      { currency: 'eur', interval: 'one_time', envVar: 'STRIPE_PRICE_ONEOFF_EUR', unitAmount: 8900 },
    ],
  },
  {
    key: 'household',
    name: 'Household',
    isRecurring: true,
    prices: [
      { currency: 'usd', interval: 'month', envVar: 'STRIPE_PRICE_HOUSEHOLD_USD_MONTHLY', unitAmount: 1900 },
      { currency: 'eur', interval: 'month', envVar: 'STRIPE_PRICE_HOUSEHOLD_EUR_MONTHLY', unitAmount: 1900 },
      // 2 months free vs. paying monthly — 19 * 10.
      { currency: 'usd', interval: 'year', envVar: 'STRIPE_PRICE_HOUSEHOLD_USD_YEARLY', unitAmount: 19000 },
      { currency: 'eur', interval: 'year', envVar: 'STRIPE_PRICE_HOUSEHOLD_EUR_YEARLY', unitAmount: 19000 },
    ],
  },
  {
    key: 'family-elders',
    name: 'Family & elders',
    isRecurring: true,
    prices: [
      { currency: 'usd', interval: 'month', envVar: 'STRIPE_PRICE_FAMILY_USD_MONTHLY', unitAmount: 2900 },
      { currency: 'eur', interval: 'month', envVar: 'STRIPE_PRICE_FAMILY_EUR_MONTHLY', unitAmount: 2900 },
      // 2 months free vs. paying monthly — 29 * 10.
      { currency: 'usd', interval: 'year', envVar: 'STRIPE_PRICE_FAMILY_USD_YEARLY', unitAmount: 29000 },
      { currency: 'eur', interval: 'year', envVar: 'STRIPE_PRICE_FAMILY_EUR_YEARLY', unitAmount: 29000 },
    ],
  },
];

async function main() {
  for (const p of plans) {
    const plan = await prisma.plan.upsert({
      where: { key: p.key },
      update: { name: p.name, isRecurring: p.isRecurring },
      create: { key: p.key, name: p.name, isRecurring: p.isRecurring },
    });

    for (const price of p.prices) {
      const stripePriceId = process.env[price.envVar];
      if (!stripePriceId) {
        throw new Error(`Missing env var ${price.envVar} — create the Stripe Price first.`);
      }
      await prisma.planPrice.upsert({
        where: { planId_currency_interval: { planId: plan.id, currency: price.currency, interval: price.interval } },
        update: { stripePriceId, unitAmount: price.unitAmount },
        create: { planId: plan.id, currency: price.currency, interval: price.interval, stripePriceId, unitAmount: price.unitAmount },
      });
      console.log(`Seeded ${p.key} / ${price.currency} / ${price.interval} -> ${stripePriceId}`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
