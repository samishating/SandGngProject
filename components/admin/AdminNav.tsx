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
    <header className="site-nav staff-nav" style={{ position: 'sticky' }}>
      <div className="nav-inner">
        <span className="brand">Hearthline admin</span>
        <nav className="nav-links" aria-label="Admin">
          <Link href="/admin">Overview</Link>
          <Link href="/admin/accounts">Account finder</Link>
          <Link href="/admin/plans">Prices</Link>
          <Link href="/admin/salespeople">Salespeople</Link>
          <Link href="/admin/sales">Sales</Link>
        </nav>
        <div className="staff-nav-actions">
          {/* Opens in a new tab so a quick look at the public site doesn't
              cost you the page you were working on. "/" lets the locale
              middleware pick the language rather than hardcoding one. */}
          <a className="btn btn-ghost" href="/" target="_blank" rel="noopener noreferrer">
            View site ↗
          </a>
          <button className="btn btn-secondary" onClick={signOut} type="button">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
