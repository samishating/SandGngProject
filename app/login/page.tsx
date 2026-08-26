// Deliberately unlinked from the public marketing site — no nav/footer
// link anywhere points here. Only reachable by URL, known to the admin
// and to salespeople told their link directly when invited.
import { Suspense } from 'react';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="card elev-md" style={{ width: 'min(420px, 100%)', padding: 32, gap: 20, display: 'flex', flexDirection: 'column' }}>
        <span className="card-title" style={{ fontSize: 22 }}>
          Hearthline sign in
        </span>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
