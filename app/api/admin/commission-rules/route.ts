// POST /api/admin/commission-rules — creates a new commission rule for a
// salesperson, either their default or scoped to one plan. Admin-only.
// Rules are superseded, not edited in place, so commission history stays
// immutable for events already recorded against an older rule.
import { NextResponse } from 'next/server';
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

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const salespersonId = typeof body.salespersonId === 'string' ? body.salespersonId : '';
  const scope = body.scope === 'PLAN_SPECIFIC' ? 'PLAN_SPECIFIC' : 'SALESPERSON_DEFAULT';
  const planId = scope === 'PLAN_SPECIFIC' && typeof body.planId === 'string' ? body.planId : null;
  const type = body.type === 'FLAT' ? 'FLAT' : 'PERCENTAGE';
  const currency = type === 'FLAT' && typeof body.currency === 'string' ? body.currency : null;
  const value = typeof body.value === 'number' ? body.value : NaN;

  if (!salespersonId || Number.isNaN(value) || value < 0) {
    return NextResponse.json({ error: 'salespersonId and a non-negative value are required' }, { status: 400 });
  }
  if (scope === 'PLAN_SPECIFIC' && !planId) {
    return NextResponse.json({ error: 'planId is required for a plan-specific rule' }, { status: 400 });
  }
  if (type === 'FLAT' && !currency) {
    return NextResponse.json({ error: 'currency is required for a flat-fee rule (a flat fee has to be set per currency)' }, { status: 400 });
  }

  await prisma.commissionRule.updateMany({
    where: { salespersonId, scope, planId, type, currency, isActive: true },
    data: { isActive: false, effectiveTo: new Date() },
  });

  const rule = await prisma.commissionRule.create({
    data: { salespersonId, scope, planId, type, currency, value },
  });

  return NextResponse.json({ rule });
}
