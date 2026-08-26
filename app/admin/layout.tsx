import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import AdminNav from '@/components/admin/AdminNav';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin');

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile || profile.role !== 'ADMIN') redirect('/dashboard');

  return (
    <div style={{ minHeight: '100vh' }}>
      <AdminNav />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>{children}</div>
    </div>
  );
}
