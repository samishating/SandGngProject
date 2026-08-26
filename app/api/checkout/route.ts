// POST /api/checkout — creates a Stripe Checkout Session for one of the 3
// plans, in the currency matching the visitor's locale, attributed to
// whatever referral tag their session's cookie carries (see lib/referral.ts).
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { resolveReferral } from '@/lib/referral';
import { currencyForLocale } from '@/i18n/routing';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const planKey = typeof body.planKey === 'string' ? body.planKey : '';
  const locale = typeof body.locale === 'string' ? body.locale : 'en';
  // Ignored for the one-off plan (it only ever has an 'one_time' price) —
  // required for Household/Family, which offer monthly and yearly billing.
  const interval = body.interval === 'year' ? 'year' : body.interval === 'month' ? 'month' : null;

  if (!planKey) {
    return NextResponse.json({ error: 'planKey is required' }, { status: 400 });
  }

  const currency = currencyForLocale(locale);

  const plan = await prisma.plan.findUnique({ where: { key: planKey }, include: { prices: true } });
  if (!plan) {
    return NextResponse.json({ error: 'Unknown plan' }, { status: 404 });
  }
  const planPrice = plan.prices.find(p => p.currency === currency && (plan.isRecurring ? p.interval === interval : p.interval === 'one_time'));
  if (!planPrice) {
    return NextResponse.json({ error: 'No price configured for this plan/currency/interval' }, { status: 404 });
  }

  const referral = await resolveReferral();
  const metadata: Record<string, string> = { planKey };
  if (referral) {
    metadata.referralTagId = referral.referralTagId;
    metadata.salespersonId = referral.salespersonId;
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? '';

  const session = await stripe.checkout.sessions.create({
    mode: plan.isRecurring ? 'subscription' : 'payment',
    line_items: [{ price: planPrice.stripePriceId, quantity: 1 }],
    success_url: `${origin}/${locale}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/${locale}?checkout=cancelled`,
    metadata,
    subscription_data: plan.isRecurring ? { metadata } : undefined,
  });

  if (!session.url) {
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
