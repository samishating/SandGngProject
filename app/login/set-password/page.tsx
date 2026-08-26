// Where both layouts send anyone still on the shared temporary password.
// Requires a session — you get here by signing in, not by URL.
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import SetPasswordForm from '@/components/auth/SetPasswordForm';

export default async function SetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/login/set-password');

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile) redirect('/login?error=noprofile');
  // Already chosen a password — nothing to do here, let the role gates route.
  if (!profile.mustChangePassword) redirect(profile.role === 'ADMIN' ? '/admin' : '/dashboard');

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="card elev-md" style={{ width: 'min(420px, 100%)', padding: 32, gap: 20, display: 'flex', flexDirection: 'column' }}>
        <span className="card-title" style={{ fontSize: 22 }}>
          Set your password
        </span>
        <SetPasswordForm />
      </div>
    </main>
  );
}
