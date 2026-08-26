import { prisma } from '@/lib/prisma';
import { CURRENCIES, type Currency } from '@/lib/currency';

/**
 * Daily USD -> EUR/GBP rates, stored in Postgres and refreshed by
 * /api/cron/refresh-rates.
 *
 * Nothing here ever calls an FX API at render time — a pricing page must not
 * depend on a third party being up, and must not pay that latency on every
 * request. Reads come from the DB; if even that is empty (a brand-new
 * database, before the first cron run) FALLBACK_RATES keeps the page showing
 * plausible prices instead of breaking or silently charging USD figures with
 * a euro sign on them.
 */

/** Rough USD -> X. Only used before the first successful refresh. */
const FALLBACK_RATES: Record<Exclude<Currency, 'usd'>, number> = {
  eur: 0.86,
  gbp: 0.73,
};

export type RateMap = Record<Currency, number>;

export async function getRates(): Promise<RateMap> {
  const rows = await prisma.exchangeRate.findMany();
  const bySymbol = new Map(rows.map(r => [r.currency, Number(r.rate)]));

  return {
    usd: 1,
    eur: bySymbol.get('eur') ?? FALLBACK_RATES.eur,
    gbp: bySymbol.get('gbp') ?? FALLBACK_RATES.gbp,
  };
}

interface FetchedRates {
  source: string;
  rateDate: string;
  rates: Record<string, number>;
}

/**
 * Primary is Frankfurter (European Central Bank reference rates, no API key).
 * open.er-api.com is the fallback so one provider having a bad day doesn't
 * stall the daily refresh. Both are keyless, which is deliberate — a rotating
 * secret is one more thing to break unattended at 6am.
 */
async function fetchFromFrankfurter(): Promise<FetchedRates> {
  const res = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,GBP', {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`frankfurter responded ${res.status}`);
  const body = (await res.json()) as { date?: string; rates?: Record<string, number> };
  if (!body.rates?.EUR || !body.rates?.GBP) throw new Error('frankfurter returned no EUR/GBP');
  return {
    source: 'frankfurter',
    rateDate: body.date ?? new Date().toISOString().slice(0, 10),
    rates: { eur: body.rates.EUR, gbp: body.rates.GBP },
  };
}

async function fetchFromErApi(): Promise<FetchedRates> {
  const res = await fetch('https://open.er-api.com/v6/latest/USD', {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`er-api responded ${res.status}`);
  const body = (await res.json()) as { rates?: Record<string, number>; time_last_update_utc?: string };
  if (!body.rates?.EUR || !body.rates?.GBP) throw new Error('er-api returned no EUR/GBP');
  const stamped = body.time_last_update_utc ? new Date(body.time_last_update_utc) : new Date();
  return {
    source: 'er-api',
    rateDate: stamped.toISOString().slice(0, 10),
    rates: { eur: body.rates.EUR, gbp: body.rates.GBP },
  };
}

export interface RefreshResult {
  source: string;
  rateDate: string;
  updated: Array<{ currency: string; rate: number }>;
}

/**
 * Fetches and stores today's rates. Throws only if every provider fails — in
 * which case nothing is written and the previous day's rates stay live, which
 * is the right failure mode for a pricing page.
 */
export async function refreshRates(): Promise<RefreshResult> {
  let fetched: FetchedRates;
  try {
    fetched = await fetchFromFrankfurter();
  } catch (primaryError) {
    try {
      fetched = await fetchFromErApi();
    } catch (fallbackError) {
      throw new Error(
        `all rate providers failed — frankfurter: ${(primaryError as Error).message}; ` +
          `er-api: ${(fallbackError as Error).message}`,
      );
    }
  }

  const updated: RefreshResult['updated'] = [];
  for (const currency of CURRENCIES) {
    if (currency === 'usd') continue;
    const rate = fetched.rates[currency];
    // Sanity floor/ceiling: a provider returning 0, null or something absurd
    // would otherwise silently reprice the whole site.
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0.1 || rate >= 10) continue;
    await prisma.exchangeRate.upsert({
      where: { currency },
      update: { rate, source: fetched.source, rateDate: fetched.rateDate, fetchedAt: new Date() },
      create: { currency, rate, source: fetched.source, rateDate: fetched.rateDate },
    });
    updated.push({ currency, rate });
  }

  if (updated.length === 0) throw new Error('rate provider returned values that failed the sanity check');

  return { source: fetched.source, rateDate: fetched.rateDate, updated };
}
