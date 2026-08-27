// POST /api/orders — records a plan order placed from the checkout page.
//
// Books the order and attributes it to whichever salesperson's referral link
// brought the visitor in, then decides whether it needs a human to close it.
// The sale is created APPROVED because everything is auto-approved while
// testing; when PayPal lands, that flow sets APPROVED on payment success and
// this path can create PENDING instead without any other change.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveReferral } from '@/lib/referral';
import { resolveCommissionRule, calculateCommissionAmount } from '@/lib/commission';
import { getPricing } from '@/lib/pricing';
import { withUniqueReference } from '@/lib/order-reference';
import { periodEndFor } from '@/lib/billing-period';
import { testCheckoutEnabled } from '@/lib/test-checkout';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INTERVALS = new Set(['one_time', 'month', 'year']);

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const planKey = typeof body.planKey === 'string' ? body.planKey : '';
  const interval = typeof body.interval === 'string' ? body.interval : '';
  const locale = typeof body.locale === 'string' ? body.locale : 'en';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1000) : '';

  // Honeypot — a real person never fills a field they cannot see. Answer 200
  // so a bot can't tell it was rejected.
  if (typeof body.company === 'string' && body.company.trim()) {
    return NextResponse.json({ ok: true });
  }

  if (!name || !EMAIL_RE.test(email) || !phone) {
    return NextResponse.json({ error: 'Name, a valid email and a phone number are required' }, { status: 400 });
  }
  if (!INTERVALS.has(interval)) {
    return NextResponse.json({ error: 'Unknown billing interval' }, { status: 400 });
  }

  const plan = await prisma.plan.findUnique({ where: { key: planKey }, include: { prices: true } });
  if (!plan) return NextResponse.json({ error: 'Unknown plan' }, { status: 404 });

  const planPrice = plan.prices.find(p => p.interval === interval);
  if (!planPrice) return NextResponse.json({ error: 'That plan has no such billing interval' }, { status: 400 });

  // Price is resolved server-side, never taken from the request — otherwise
  // the amount recorded (and the commission paid on it) would be whatever the
  // browser claimed.
  const pricing = await getPricing(locale);
  const priced = pricing.plans[plan.key]?.[interval];
  if (!priced) return NextResponse.json({ error: 'Could not price that plan' }, { status: 500 });

  const referral = await resolveReferral();

  // An order that came through a salesperson's link is theirs to close — it
  // waits in their callback queue until they've spoken to the customer.
  //
  // A self-serve order has nobody to call, so it completes by itself. When
  // exactly depends on whether the customer still has a payment step ahead of
  // them: with one, the order is settled by the payment; without one, there is
  // nothing left to wait for and it is done at checkout. Marking it done
  // before a payment that is still to come would leave the pay page rejecting
  // an order it had already settled.
  const selfServe = !referral?.salespersonId;
  const paymentStepAhead = testCheckoutEnabled();
  const completesNow = selfServe && !paymentStepAhead;

  const now = new Date();
  const status = completesNow ? 'ACTIVE' : 'AWAITING_CALLBACK';

  const sale = await withUniqueReference(reference =>
    prisma.sale.create({
      data: {
        reference,
        planId: plan.id,
        // Recorded so the subscription's end date can be worked out — the plan
        // alone doesn't say which term was bought.
        interval,
        referralTagId: referral?.referralTagId ?? null,
        salespersonId: referral?.salespersonId ?? null,
        currency: pricing.currency,
        amount: priced.amount,
        amountUsd: priced.amountUsd,
        provider: 'MANUAL',
        approval: 'APPROVED',
        status,
        // Only a self-serve order has a term from the outset. A referred one
        // gets its dates when the agent marks it Sold, so a lead that sits in
        // the queue for days doesn't lose days the customer paid for.
        periodStart: completesNow ? now : null,
        periodEnd: completesNow ? periodEndFor(now, interval) : null,
        calledBackAt: completesNow ? now : null,
        customerName: name,
        customerPhone: phone,
        // Digits kept alongside so the account finder can match a number
        // however either side formatted it.
        customerPhoneDigits: phone.replace(/\D/g, '') || null,
        customerEmail: email,
        note: note || null,
        mode: plan.isRecurring ? 'SUBSCRIPTION' : 'PAYMENT',
      },
    }),
  );

  // Commission is snapshotted now, against whatever rule applies at this
  // moment — editing a rule later must never rewrite what was already earned.
  if (referral?.salespersonId) {
    const rule = await resolveCommissionRule({
      salespersonId: referral.salespersonId,
      planId: plan.id,
      currency: pricing.currency,
    });

    await prisma.commissionEvent.create({
      data: {
        saleId: sale.id,
        salespersonId: referral.salespersonId,
        eventType: 'INITIAL_PURCHASE',
        grossAmount: priced.amount,
        currency: pricing.currency,
        commissionRuleId: rule?.id ?? null,
        commissionType: rule?.type ?? null,
        commissionValue: rule?.value ?? null,
        // No matching rule records zero rather than guessing a rate — the
        // admin sees it as unconfigured instead of silently underpaying.
        commissionAmount: rule ? calculateCommissionAmount(rule, priced.amount) : 0,
      },
    });
  }

  return NextResponse.json({ ok: true, reference: sale.reference });
}
