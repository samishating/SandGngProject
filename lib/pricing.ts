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

export interface PricingData {
  currency: Currency;
  /** planKey -> interval -> pricing */
  plans: Record<string, Record<string, PlanPricing>>;
  /** How much cheaper a year is than 12 months, as a whole percent. */
  householdSavings: number;
}

export async function getPricing(locale: string): Promise<PricingData> {
  const [currency, rates, planRows] = await Promise.all([
    resolveCurrency(locale),
    getRates(),
    prisma.plan.findMany({ include: { prices: true } }),
  ]);

  const rate = rates[currency];
  const plans: PricingData['plans'] = {};

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
  }

  // Computed from the USD figures, not the converted ones: rounding to whole
  // units would otherwise nudge the advertised percentage around by currency.
  const household = plans.household ?? {};
  const monthUsd = household.month?.amountUsd ?? 0;
  const yearUsd = household.year?.amountUsd ?? 0;
  const householdSavings = monthUsd > 0 && yearUsd > 0 ? Math.round((1 - yearUsd / (monthUsd * 12)) * 100) : 0;

  return { currency, plans, householdSavings };
}
