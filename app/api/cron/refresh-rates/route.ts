// Daily FX refresh, triggered by the Vercel cron declared in vercel.json.
// Also safe to hit by hand when a rate looks stale.
import { NextResponse } from 'next/server';
import { refreshRates } from '@/lib/exchange-rates';

export const runtime = 'nodejs';
// Rates are written to the DB, never cached at the edge.
export const dynamic = 'force-dynamic';

/**
 * Vercel signs cron invocations with CRON_SECRET when it's set. Requests
 * without it are rejected so this can't be used as a free way to hammer the
 * upstream FX providers from our IP. If CRON_SECRET is unset (local dev) the
 * check is skipped.
 */
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await refreshRates();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    // 500 so a failed run shows up in Vercel's cron history rather than
    // looking like a success. Yesterday's rates are still serving.
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
