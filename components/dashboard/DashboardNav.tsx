'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * `waitingCount` is resolved server-side in the layout and passed down, so the
 * badge is correct on first paint rather than appearing a moment later.
 */
export default function DashboardNav({ waitingCount }: { waitingCount: number }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <header className="site-nav staff-nav" style={{ position: 'sticky' }}>
      <div className="nav-inner">
        <span className="brand">Hearthline</span>
        <nav className="nav-links" aria-label="Dashboard">
          <Link href="/dashboard">Your sales</Link>
          <Link href="/dashboard/links">Your links</Link>
          {/* The finder doubles as the callback queue when nothing is typed,
              so the badge still shows how many people are waiting. */}
          <Link href="/dashboard/accounts">
            Account finder
            {waitingCount > 0 && (
              <span className="nav-badge" aria-label={`${waitingCount} awaiting a callback`}>
                {waitingCount}
              </span>
            )}
          </Link>
        </nav>
        <button className="btn btn-secondary" onClick={signOut} type="button">
          Sign out
        </button>
      </div>
    </header>
  );
}
