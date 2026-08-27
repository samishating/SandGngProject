import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import AdminNav from '@/components/admin/AdminNav';
import TestModeBanner from '@/components/admin/TestModeBanner';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin');

  // A session with no Profile row has nowhere valid to go — bouncing it to
  // /dashboard would just bounce it back here forever, so it's sent to /login
  // with an explanation instead. Only an actual role mismatch redirects
  // across to the other section.
  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile) redirect('/login?error=noprofile');
  // Must come before the role check: the shared temporary password is only
  // acceptable because no authenticated page renders while it's still in use.
  if (profile.mustChangePassword) redirect('/login/set-password');
  if (profile.role !== 'ADMIN') redirect('/dashboard');

  return (
    <div style={{ minHeight: '100vh' }}>
      <AdminNav />
      <TestModeBanner />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>{children}</div>
    </div>
  );
}
