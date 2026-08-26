import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getRates } from '@/lib/exchange-rates';
import { convertFromUsd, currencyForCountry, currencyForLocale, formatMoney, isCurrency, type Currency } from '@/lib/currency';

/**
 * Resolves what a visitor should see: which currency, and every plan price
 * already converted and formatted in it.
 *
 * Done server-side so the page arrives with the right prices in the HTML —
 * converting in the browser would flash USD first, and would ship the rate
 * table to every visitor.
 */

const CURRENCY_COOKIE = 'hl_currency';

/**
 * Country comes from Vercel's edge geo header, which is absent locally and on
 * any non-Vercel host. An explicit choice (cookie) always wins, so a visitor
 * who overrides the guess keeps their override.
 */
export async function resolveCurrency(locale: string): Promise<Currency> {
  const h = await headers();

  const chosen = readCurrencyCookie(h.get('cookie'));
  if (chosen) return chosen;

  const country = h.get('x-vercel-ip-country');
  if (country) return currencyForCountry(country);

  // No geo at all (local dev, self-hosted): fall back to the language, which
  // never guesses GBP — see the note in lib/currency.ts.
  return currencyForLocale(locale);
}

function readCurrencyCookie(cookieHeader: string | null): Currency | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name !== CURRENCY_COOKIE) continue;
    const value = rest.join('=').toLowerCase();
    if (isCurrency(value)) return value;
  }
  return null;
}

export interface PlanPricing {
  /** Formatted for display, e.g. "$19" / "16 €" / "£14". */
  display: string;
  /** Raw minor units in the visitor's currency, for anything that needs maths. */
  amount: number;
  amountUsd: number;
}

export interface PricedPlan {
  key: string;
  name: string;
  description: string | null;
  badge: string | null;
  isRecurring: boolean;
  isFeatured: boolean;
  /** interval -> pricing, already converted and formatted. */
  prices: Record<string, PlanPricing>;
}

export interface PricingData {
  currency: Currency;
  /** Display order, active plans only. */
  list: PricedPlan[];
  /** planKey -> interval -> pricing. Kept for lookups by key. */
  plans: Record<string, Record<string, PlanPricing>>;
  /** How much cheaper a year is than 12 months, as a whole percent. */
  householdSavings: number;
}

/**
 * Plan copy is stored in English on the row, with other locales in a
 * `translations` JSON blob. A missing locale or a missing field falls back to
 * the column, so a plan added in one language still renders everywhere rather
 * than showing a blank card.
 */
function localizePlan(
  plan: { name: string; description: string | null; badge: string | null; translations: unknown },
  locale: string,
): { name: string; description: string | null; badge: string | null } {
  const all = plan.translations as Record<string, Record<string, string>> | null | undefined;
  const t = all?.[locale];
  return {
    name: t?.name?.trim() || plan.name,
    description: t?.description?.trim() || plan.description,
    badge: t?.badge?.trim() || plan.badge,
  };
}

export async function getPricing(locale: string): Promise<PricingData> {
  const [currency, rates, planRows] = await Promise.all([
    resolveCurrency(locale),
    getRates(),
    prisma.plan.findMany({
      // Retired plans stay in the table so existing sales keep their history,
      // but must never reach the pricing page.
      where: { isActive: true },
      include: { prices: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  const rate = rates[currency];
  const plans: PricingData['plans'] = {};
  const list: PricedPlan[] = [];

  for (const plan of planRows) {
    const byInterval: Record<string, PlanPricing> = {};
    for (const price of plan.prices) {
      const amount = convertFromUsd(price.amountUsd, currency, rate);
      byInterval[price.interval] = {
        amount,
        amountUsd: price.amountUsd,
        display: formatMoney(amount, currency, locale),
      };
    }
    plans[plan.key] = byInterval;

    // A plan with no price yet would render a card with a blank where the
    // money goes, so it stays off the page until one is set.
    if (Object.keys(byInterval).length === 0) continue;

    const copy = localizePlan(plan, locale);
    list.push({
      key: plan.key,
      name: copy.name,
      description: copy.description,
      badge: copy.badge,
      isRecurring: plan.isRecurring,
      isFeatured: plan.isFeatured,
      prices: byInterval,
    });
  }

  // Computed from the USD figures, not the converted ones: rounding to whole
  // units would otherwise nudge the advertised percentage around by currency.
  const household = plans.household ?? {};
  const monthUsd = household.month?.amountUsd ?? 0;
  const yearUsd = household.year?.amountUsd ?? 0;
  const householdSavings = monthUsd > 0 && yearUsd > 0 ? Math.round((1 - yearUsd / (monthUsd * 12)) * 100) : 0;

  return { currency, list, plans, householdSavings };
}
