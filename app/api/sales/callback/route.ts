// PATCH /api/sales/callback — moves an order out of the callback queue.
//
// Available to the salesperson the order is attributed to, and to any admin.
// Unattributed orders (nobody's referral link) are admin-only, since there is
// no agent who owns them.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { periodEndFor } from '@/lib/billing-period';

// What an agent can move a waiting order to. Refunds are deliberately absent:
// nothing has been charged yet at this point in the flow.
const ALLOWED = new Set(['ACTIVE', 'CANCELED']);

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const saleId = typeof body.saleId === 'string' ? body.saleId : '';
  const status = typeof body.status === 'string' ? body.status : '';

  if (!saleId || !ALLOWED.has(status)) {
    return NextResponse.json({ error: 'saleId and a status of ACTIVE or CANCELED are required' }, { status: 400 });
  }

  const sale = await prisma.sale.findUnique({ where: { id: saleId } });
  if (!sale) return NextResponse.json({ error: 'No such order' }, { status: 404 });

  // An agent may only touch their own orders. Checked against the record
  // rather than anything the client sent.
  const isAdmin = profile.role === 'ADMIN';
  if (!isAdmin && sale.salespersonId !== profile.id) {
    return NextResponse.json({ error: 'Not your order' }, { status: 403 });
  }

  if (sale.status !== 'AWAITING_CALLBACK') {
    return NextResponse.json({ error: 'That order has already been dealt with' }, { status: 409 });
  }

  const now = new Date();

  // The subscription term starts when the sale is actually made, not when the
  // order was placed — a lead that sat in the queue for three days shouldn't
  // lose three days of what the customer paid for.
  const startsNow = status === 'ACTIVE';
  const periodStart = startsNow ? now : null;
  const periodEnd = startsNow ? periodEndFor(now, sale.interval) : null;

  const updated = await prisma.sale.update({
    where: { id: saleId },
    data: {
      status: status as 'ACTIVE' | 'CANCELED',
      calledBackAt: now,
      periodStart,
      periodEnd,
    },
  });

  return NextResponse.json({
    sale: { id: updated.id, status: updated.status, periodEnd: updated.periodEnd },
  });
}
