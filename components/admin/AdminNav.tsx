'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminNav() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <header className="site-nav" style={{ position: 'sticky' }}>
      <div className="nav-inner">
        <span className="brand">Hearthline admin</span>
        <nav className="nav-links" aria-label="Admin">
          <Link href="/admin">Overview</Link>
          <Link href="/admin/salespeople">Salespeople</Link>
          <Link href="/admin/sales">Sales</Link>
        </nav>
        <button className="btn btn-secondary" onClick={signOut} type="button">
          Sign out
        </button>
      </div>
    </header>
  );
}
