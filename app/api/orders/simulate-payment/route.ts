// POST /api/orders/simulate-payment — pretends a payment succeeded.
//
// Exists so the order → paid → commission chain can be exercised end to end
// without a payment processor. It takes an order reference and nothing else:
// no card details are sent here, because the simulator never transmits them.
//
// Refuses to do anything unless NEXT_PUBLIC_TEST_CHECKOUT=1, checked here and
// not only on the page, so the endpoint can't be called directly in an
// environment where the simulator is meant to be off.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { periodEndFor } from '@/lib/billing-period';
import { normalizeReference } from '@/lib/order-reference';
import { testCheckoutEnabled } from '@/lib/test-checkout';

export async function POST(req: Request) {
  if (!testCheckoutEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const reference = normalizeReference(typeof body.reference === 'string' ? body.reference : '');
  if (!reference) return NextResponse.json({ error: 'reference is required' }, { status: 400 });

  const sale = await prisma.sale.findUnique({ where: { reference } });
  if (!sale) return NextResponse.json({ error: 'No such order' }, { status: 404 });

  if (sale.status !== 'AWAITING_CALLBACK') {
    return NextResponse.json({ error: 'That order has already been settled' }, { status: 409 });
  }

  const now = new Date();

  // Exactly what an agent marking the callback "Sold" does — same status, same
  // term dates — so what this exercises is the real path, not a parallel one.
  const updated = await prisma.sale.update({
    where: { id: sale.id },
    data: {
      status: 'ACTIVE',
      approval: 'APPROVED',
      calledBackAt: now,
      periodStart: now,
      periodEnd: periodEndFor(now, sale.interval),
      note: [sale.note, 'Paid via the test payment simulator.'].filter(Boolean).join(' — '),
    },
  });

  return NextResponse.json({
    ok: true,
    reference: updated.reference,
    status: updated.status,
    periodEnd: updated.periodEnd,
  });
}
