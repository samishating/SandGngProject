/**
 * Which currency a visitor is shown, and how a USD price becomes that
 * currency. USD is the only stored price (PlanPrice.amountUsd); everything
 * else is derived from ExchangeRate at render time.
 */

export const CURRENCIES = ['usd', 'eur', 'gbp'] as const;
export type Currency = (typeof CURRENCIES)[number];

export function isCurrency(value: string): value is Currency {
  return (CURRENCIES as readonly string[]).includes(value);
}

/** ISO-3166 alpha-2 codes that bill in GBP. */
const GBP_COUNTRIES = new Set(['GB', 'IM', 'JE', 'GG']);

/** Eurozone members. Non-euro EU states (PL, SE, CZ, …) fall through to USD. */
const EUR_COUNTRIES = new Set([
  'AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT',
  'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES',
  // Not EU members, but use the euro day to day.
  'AD', 'MC', 'ME', 'SM', 'VA', 'XK',
]);

/**
 * Country code -> currency. The country comes from Vercel's geo header, which
 * is absent locally and can be absent for a proxied or unknown IP — hence the
 * USD default rather than a throw.
 */
export function currencyForCountry(country: string | null | undefined): Currency {
  if (!country) return 'usd';
  const code = country.toUpperCase();
  if (GBP_COUNTRIES.has(code)) return 'gbp';
  if (EUR_COUNTRIES.has(code)) return 'eur';
  return 'usd';
}

/**
 * Fallback for when there's no country at all: infer from the language the
 * visitor chose. Deliberately never returns GBP — 'en' is ambiguous between
 * US and UK, and guessing wrong on money is worse than defaulting to USD.
 */
export function currencyForLocale(locale: string): Currency {
  return locale === 'en' ? 'usd' : 'eur';
}

/**
 * Converts USD cents to `currency` and rounds to a whole unit.
 *
 * Rounding is the point, not a detail: rates are refreshed daily, and without
 * it a $19 plan would advertise €16.29 one morning and €16.34 the next. Whole
 * units keep the page stable and look like a price rather than a conversion.
 */
export function convertFromUsd(amountUsdCents: number, currency: Currency, rate: number): number {
  if (currency === 'usd') return amountUsdCents;
  const converted = (amountUsdCents / 100) * rate;
  return Math.round(converted) * 100;
}

/** Locale to format prices in — drives symbol placement and separators. */
export function formatMoney(cents: number, currency: Currency, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
