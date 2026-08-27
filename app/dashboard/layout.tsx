import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import DashboardNav from '@/components/dashboard/DashboardNav';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/dashboard');

  // See the matching note in app/admin/layout.tsx — a profile-less session
  // must not be redirected into the other section, or the two layouts
  // redirect to each other indefinitely.
  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile) redirect('/login?error=noprofile');
  // Removed while signed in — a live session shouldn't outlast the account.
  if (!profile.isActive) redirect('/login?error=inactive');
  // See the matching note in app/admin/layout.tsx.
  if (profile.mustChangePassword) redirect('/login/set-password');
  if (profile.role !== 'SALESPERSON') redirect('/admin');

  // Counted here rather than in the nav component so the badge is right on
  // first paint instead of popping in after a client fetch.
  const waitingCount = await prisma.sale.count({
    where: { salespersonId: profile.id, status: 'AWAITING_CALLBACK' },
  });

  return (
    <div style={{ minHeight: '100vh' }}>
      <DashboardNav waitingCount={waitingCount} />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>{children}</div>
    </div>
  );
}
