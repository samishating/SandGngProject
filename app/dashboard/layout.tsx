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

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile || profile.role !== 'SALESPERSON') redirect('/admin');

  return (
    <div style={{ minHeight: '100vh' }}>
      <DashboardNav />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>{children}</div>
    </div>
  );
}
