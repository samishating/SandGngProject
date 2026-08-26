// PATCH /api/admin/plan-prices — updates a plan's USD price (admin-only).
// USD is the only stored price; EUR and GBP follow automatically from the
// daily exchange rate, so this is the single place money is set.
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

/** The marketing pages render prices server-side, so cached HTML must go. */
function revalidateMarketing() {
  revalidatePath('/[locale]/pricing', 'page');
  revalidatePath('/[locale]', 'page');
  revalidatePath('/[locale]/checkout', 'page');
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  return profile?.role === 'ADMIN';
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const priceId = typeof body.priceId === 'string' ? body.priceId : '';
  // Accepted as whole dollars — an admin types 19, not 1900. Cents are an
  // implementation detail that shouldn't leak into the form.
  const dollars = Number(body.amountUsd);

  if (!priceId) {
    return NextResponse.json({ error: 'priceId is required' }, { status: 400 });
  }
  if (!Number.isFinite(dollars) || dollars <= 0 || dollars > 100_000) {
    return NextResponse.json({ error: 'Enter an amount between 1 and 100000' }, { status: 400 });
  }

  const existing = await prisma.planPrice.findUnique({ where: { id: priceId } });
  if (!existing) {
    return NextResponse.json({ error: 'No such price' }, { status: 404 });
  }

  const updated = await prisma.planPrice.update({
    where: { id: priceId },
    data: { amountUsd: Math.round(dollars * 100) },
  });

  // The marketing pages render prices on the server, so they must be rebuilt
  // or an edited price keeps serving the old figure from cache.
  revalidateMarketing();

  return NextResponse.json({ price: updated });
}

const INTERVALS = ['one_time', 'month', 'year'] as const;

/** Adds a billing interval to a plan — e.g. giving an existing plan a yearly option. */
export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const planId = typeof body.planId === 'string' ? body.planId : '';
  const interval = typeof body.interval === 'string' ? body.interval : '';
  const dollars = Number(body.amountUsd);

  if (!planId || !INTERVALS.includes(interval as (typeof INTERVALS)[number])) {
    return NextResponse.json({ error: 'planId and an interval of one_time, month or year are required' }, { status: 400 });
  }
  if (!Number.isFinite(dollars) || dollars <= 0 || dollars > 100_000) {
    return NextResponse.json({ error: 'Enter an amount between 1 and 100000' }, { status: 400 });
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return NextResponse.json({ error: 'No such plan' }, { status: 404 });

  const clash = await prisma.planPrice.findUnique({ where: { planId_interval: { planId, interval } } });
  if (clash) return NextResponse.json({ error: 'That plan already has a price for this interval' }, { status: 409 });

  const price = await prisma.planPrice.create({
    data: { planId, interval, amountUsd: Math.round(dollars * 100) },
  });

  revalidateMarketing();
  return NextResponse.json({ price });
}

/** Removes one billing interval. The plan itself is untouched. */
export async function DELETE(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const price = await prisma.planPrice.findUnique({ where: { id }, include: { plan: { include: { prices: true } } } });
  if (!price) return NextResponse.json({ error: 'No such price' }, { status: 404 });

  // Removing the only price would leave a live plan rendering a card with a
  // blank where the money goes.
  if (price.plan.isActive && price.plan.prices.length === 1) {
    return NextResponse.json({ error: 'This is the plan’s only price — retire the plan instead' }, { status: 400 });
  }

  await prisma.planPrice.delete({ where: { id } });
  revalidateMarketing();
  return NextResponse.json({ ok: true });
}
