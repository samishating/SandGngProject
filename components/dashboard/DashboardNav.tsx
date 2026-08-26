'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DashboardNav() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <header className="site-nav" style={{ position: 'sticky' }}>
      <div className="nav-inner">
        <span className="brand">Hearthline</span>
        <button className="btn btn-secondary" onClick={signOut} type="button">
          Sign out
        </button>
      </div>
    </header>
  );
}
