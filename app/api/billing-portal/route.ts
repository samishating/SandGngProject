// POST /api/billing-portal — given a just-completed Checkout Session id,
// opens a Stripe Customer Portal session for that session's customer. Takes
// a sessionId rather than a raw customerId so a client can only reach the
// portal for a purchase they just made, not an arbitrary customer.
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  if (!customerId) {
    return NextResponse.json({ error: 'No customer on this session' }, { status: 404 });
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: origin,
  });

  return NextResponse.json({ url: portal.url });
}
