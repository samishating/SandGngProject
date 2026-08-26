// POST creates an additional referral tag for an existing salesperson;
// PATCH toggles a tag active/inactive. Admin-only.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

const TAG_RE = /^[a-z0-9-]{3,32}$/;

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
  const tag = typeof body.tag === 'string' ? body.tag.trim().toLowerCase() : '';

  if (!salespersonId || !TAG_RE.test(tag)) {
    return NextResponse.json({ error: 'salespersonId and a valid tag (3-32 lowercase letters/numbers/hyphens) are required' }, { status: 400 });
  }

  const existing = await prisma.referralTag.findUnique({ where: { tag } });
  if (existing) return NextResponse.json({ error: 'That referral tag is already taken' }, { status: 409 });

  const referralTag = await prisma.referralTag.create({ data: { tag, salespersonId } });
  return NextResponse.json({ referralTag });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  const isActive = typeof body.isActive === 'boolean' ? body.isActive : undefined;

  if (!id || isActive === undefined) {
    return NextResponse.json({ error: 'id and isActive are required' }, { status: 400 });
  }

  const referralTag = await prisma.referralTag.update({ where: { id }, data: { isActive } });
  return NextResponse.json({ referralTag });
}
