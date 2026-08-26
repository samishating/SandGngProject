// POST /api/admin/salespeople — invites a new salesperson (admin-only).
// Salespeople never self-register; this is the only way an account gets
// created. Uses the Supabase service-role client to send the invite, then
// creates the matching Profile + their first ReferralTag.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const displayName = typeof body.displayName === 'string' && body.displayName.trim() ? body.displayName.trim() : null;
  const tag = typeof body.tag === 'string' ? body.tag.trim().toLowerCase() : '';

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }
  if (!TAG_RE.test(tag)) {
    return NextResponse.json({ error: 'Referral tag must be 3-32 lowercase letters, numbers or hyphens' }, { status: 400 });
  }

  const existingTag = await prisma.referralTag.findUnique({ where: { tag } });
  if (existingTag) {
    return NextResponse.json({ error: 'That referral tag is already taken' }, { status: 409 });
  }

  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/dashboard`,
  });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? 'Failed to invite user' }, { status: 500 });
  }

  const profile = await prisma.profile.upsert({
    where: { id: data.user.id },
    update: { role: 'SALESPERSON', displayName, email },
    create: { id: data.user.id, role: 'SALESPERSON', displayName, email },
  });

  const referralTag = await prisma.referralTag.create({
    data: { tag, salespersonId: profile.id },
  });

  return NextResponse.json({ profile, referralTag });
}
