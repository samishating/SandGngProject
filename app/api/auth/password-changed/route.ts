// Clears Profile.mustChangePassword after the user has actually set a new
// password. Deliberately takes no input: it acts only on the caller's own
// session, so it can't be used to clear the flag on someone else's account.
import { NextResponse } from 'next/server';
import { createClient as createRawClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { TEMP_PASSWORD } from '@/lib/auth-constants';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'not signed in' }, { status: 401 });

  // Verified server-side rather than trusting the client's word that it
  // changed anything: if the temporary password still signs this account in,
  // the flag stays put. Uses a throwaway client with persistSession off so a
  // successful probe can't disturb the caller's live session.
  const probe = createRawClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: stillTemp } = await probe.auth.signInWithPassword({
    email: user.email,
    password: TEMP_PASSWORD,
  });
  if (!stillTemp) {
    return NextResponse.json({ error: 'password unchanged' }, { status: 400 });
  }

  const profile = await prisma.profile.update({
    where: { id: user.id },
    data: { mustChangePassword: false },
  });

  // Hand back where to go, so the browser doesn't have to know about roles.
  return NextResponse.json({
    ok: true,
    destination: profile.role === 'ADMIN' ? '/admin' : '/dashboard',
  });
}
