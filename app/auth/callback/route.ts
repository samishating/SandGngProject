// GET /auth/callback — exchanges the magic-link code for a session, then
// sends admins to /admin and everyone else to wherever they were headed
// (?next=, defaulting to /dashboard).
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const profile = await prisma.profile.findUnique({ where: { id: data.user.id } });
      const destination = profile?.role === 'ADMIN' ? '/admin' : next;
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
