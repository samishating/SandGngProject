// POST /api/auth/sign-in — signs in with either a username or an email.
//
// Supabase only knows about email addresses, so a username has to be resolved
// to one first. That resolution happens here rather than in the browser on
// purpose: an endpoint that answered "which email owns this username?" would
// let anyone map staff handles to addresses. Nothing is returned but success
// or failure, and the failure is the same either way.
//
// Signing in server-side is what lets this work at all — a Route Handler can
// write the session cookies, which a Server Component cannot.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { isEmail, normalizeUsername } from '@/lib/username';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!identifier || !password) {
    return NextResponse.json({ error: 'Enter your username or email and your password.' }, { status: 400 });
  }

  let email = identifier.toLowerCase();

  if (!isEmail(identifier)) {
    const profile = await prisma.profile.findUnique({
      where: { username: normalizeUsername(identifier) },
      select: { email: true },
    });
    // Deliberately falls through with an unusable address rather than
    // returning early: an unknown username and a wrong password must take the
    // same path and give the same answer, or this becomes a way to find out
    // which handles exist.
    email = profile?.email ?? `${normalizeUsername(identifier)}@invalid.local`;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: "That didn't match an account. Check and try again." }, { status: 401 });
  }

  // The session cookies are already on the response; the client just needs to
  // know where to go next.
  const profile = await prisma.profile.findUnique({
    where: { email },
    select: { role: true, mustChangePassword: true, isActive: true },
  });

  // Someone who has been removed. Signed out again immediately rather than
  // left holding a valid session, and told the same thing as a bad password
  // so a former employee learns nothing from the difference.
  if (profile && !profile.isActive) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "That didn't match an account. Check and try again." }, { status: 401 });
  }

  const destination = profile?.mustChangePassword
    ? '/login/set-password'
    : profile?.role === 'ADMIN'
      ? '/admin'
      : '/dashboard';

  return NextResponse.json({ ok: true, destination });
}
