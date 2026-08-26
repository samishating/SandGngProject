// PATCH /api/admin/plan-prices — updates a plan's USD price (admin-only).
// USD is the only stored price; EUR and GBP follow automatically from the
// daily exchange rate, so this is the single place money is set.
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

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
  revalidatePath('/[locale]/pricing', 'page');
  revalidatePath('/[locale]', 'page');

  return NextResponse.json({ price: updated });
}
