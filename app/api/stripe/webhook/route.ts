// POST /api/stripe/webhook — the only place Sale and CommissionEvent rows
// get created. Node runtime is required (raw body + Prisma, neither works
// on Edge). Every handler is idempotent via stripeEventId, since Stripe
// retries webhook deliveries that don't 200 in time.
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { resolveCommissionRule, calculateCommissionAmount } from '@/lib/commission';
import { paymentIntentForInvoice } from '@/lib/stripe-payment-intent';

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, event.id);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice, event.id);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge, event.id);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(`Error handling Stripe webhook event ${event.type} (${event.id})`, err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function resolveSessionPaymentIntentId(session: Stripe.Checkout.Session): Promise<string | null> {
  if (typeof session.payment_intent === 'string') return session.payment_intent;
  if (session.payment_intent) return session.payment_intent.id;
  // Subscription-mode sessions don't get a session-level payment_intent —
  // trace through the first invoice instead.
  const invoiceId = typeof session.invoice === 'string' ? session.invoice : session.invoice?.id;
  return invoiceId ? paymentIntentForInvoice(invoiceId) : null;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, stripeEventId: string) {
  const existing = await prisma.sale.findUnique({ where: { stripeCheckoutSessionId: session.id } });
  if (existing) return; // webhook retry

  const planKey = session.metadata?.planKey;
  if (!planKey) {
    console.error('checkout.session.completed missing planKey metadata', session.id);
    return;
  }
  const plan = await prisma.plan.findUnique({ where: { key: planKey } });
  if (!plan) {
    console.error('checkout.session.completed references unknown planKey', planKey);
    return;
  }

  const currency = (session.currency ?? 'usd').toLowerCase();
  const grossAmount = session.amount_total ?? 0;
  const salespersonId = session.metadata?.salespersonId || null;
  const referralTagId = session.metadata?.referralTagId || null;
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : (session.subscription?.id ?? null);
  const customerId = typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? '');
  const paymentIntentId = await resolveSessionPaymentIntentId(session);

  const sale = await prisma.sale.create({
    data: {
      referralTagId,
      salespersonId,
      planId: plan.id,
      currency,
      stripeCustomerId: customerId,
      stripeCheckoutSessionId: session.id,
      stripeSubscriptionId: subscriptionId,
      stripePaymentIntentId: paymentIntentId,
      mode: session.mode === 'subscription' ? 'SUBSCRIPTION' : 'PAYMENT',
      status: 'ACTIVE',
    },
  });

  if (salespersonId) {
    await recordCommissionEvent({
      saleId: sale.id,
      salespersonId,
      planId: plan.id,
      currency,
      grossAmount,
      eventType: 'INITIAL_PURCHASE',
      stripeEventId,
      stripeObjectId: session.id,
      stripePaymentIntentId: paymentIntentId,
    });
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice, stripeEventId: string) {
  // The first invoice on a new subscription is already covered by
  // checkout.session.completed — only renewals land here.
  if (invoice.billing_reason !== 'subscription_cycle' || !invoice.id) return;

  const subDetails = invoice.parent?.subscription_details;
  const subscriptionId = typeof subDetails?.subscription === 'string' ? subDetails.subscription : subDetails?.subscription?.id;
  if (!subscriptionId) return;

  const sale = await prisma.sale.findUnique({ where: { stripeSubscriptionId: subscriptionId } });
  if (!sale || !sale.salespersonId) return; // no referral attribution, nothing to record

  const currency = (invoice.currency ?? sale.currency).toLowerCase();
  const paymentIntentId = await paymentIntentForInvoice(invoice.id);

  await recordCommissionEvent({
    saleId: sale.id,
    salespersonId: sale.salespersonId,
    planId: sale.planId,
    currency,
    grossAmount: invoice.amount_paid,
    eventType: 'RENEWAL',
    stripeEventId,
    stripeObjectId: invoice.id,
    stripePaymentIntentId: paymentIntentId,
  });
}

async function recordCommissionEvent(args: {
  saleId: string;
  salespersonId: string;
  planId: string;
  currency: string;
  grossAmount: number;
  eventType: 'INITIAL_PURCHASE' | 'RENEWAL';
  stripeEventId: string;
  stripeObjectId: string;
  stripePaymentIntentId: string | null;
}) {
  const already = await prisma.commissionEvent.findUnique({ where: { stripeEventId: args.stripeEventId } });
  if (already) return;

  const rule = await resolveCommissionRule({ salespersonId: args.salespersonId, planId: args.planId, currency: args.currency });
  const commissionAmount = rule ? calculateCommissionAmount(rule, args.grossAmount) : 0;

  await prisma.commissionEvent.create({
    data: {
      saleId: args.saleId,
      salespersonId: args.salespersonId,
      eventType: args.eventType,
      stripeEventId: args.stripeEventId,
      stripeObjectId: args.stripeObjectId,
      stripePaymentIntentId: args.stripePaymentIntentId,
      grossAmount: args.grossAmount,
      currency: args.currency,
      commissionRuleId: rule?.id ?? null,
      commissionType: rule?.type ?? null,
      commissionValue: rule?.value ?? null,
      commissionAmount,
    },
  });
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  if (subscription.status !== 'canceled') return; // other transitions (past_due, etc.) are out of scope for v1
  const sale = await prisma.sale.findUnique({ where: { stripeSubscriptionId: subscription.id } });
  if (!sale || sale.status !== 'ACTIVE') return;
  await prisma.sale.update({ where: { id: sale.id }, data: { status: 'CANCELED' } });
}

async function handleChargeRefunded(charge: Stripe.Charge, stripeEventId: string) {
  const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  const sale = await prisma.sale.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
  const originalEvent = await prisma.commissionEvent.findFirst({
    where: { stripePaymentIntentId: paymentIntentId, eventType: { in: ['INITIAL_PURCHASE', 'RENEWAL'] } },
    orderBy: { createdAt: 'desc' },
  });

  const saleId = sale?.id ?? originalEvent?.saleId;
  if (!saleId) {
    console.error('charge.refunded: no matching sale for payment_intent', paymentIntentId);
    return;
  }

  await prisma.sale.update({ where: { id: saleId }, data: { status: 'REFUNDED' } });

  // No commission was ever recorded for this sale (no referral attribution)
  // — nothing to claw back.
  if (!originalEvent) return;

  const already = await prisma.commissionEvent.findUnique({ where: { stripeEventId } });
  if (already) return;

  // Reverses proportionally to what was actually refunded vs. the original
  // charge — a full refund reverses 100% of the commission, a 50% refund
  // reverses 50%. NOTE: this compares against the single original event's
  // gross amount, so a charge refunded in more than one separate partial
  // refund will be handled correctly for the first one but may overcount a
  // second partial refund on the same charge — a genuine edge case left
  // for a future pass rather than adding cross-event delta-tracking now.
  const refundFraction = Math.min(1, charge.amount_refunded / originalEvent.grossAmount);
  const commissionAmount = -Math.round(originalEvent.commissionAmount * refundFraction);
  const grossAmount = -Math.round(originalEvent.grossAmount * refundFraction);

  await prisma.commissionEvent.create({
    data: {
      saleId,
      salespersonId: originalEvent.salespersonId,
      eventType: 'REFUND_REVERSAL',
      stripeEventId,
      stripeObjectId: charge.id,
      stripePaymentIntentId: paymentIntentId,
      grossAmount,
      currency: (charge.currency ?? originalEvent.currency).toLowerCase(),
      commissionRuleId: originalEvent.commissionRuleId,
      commissionType: originalEvent.commissionType,
      commissionValue: originalEvent.commissionValue,
      commissionAmount,
    },
  });
}
