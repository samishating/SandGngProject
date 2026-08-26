'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Status = 'idle' | 'submitting' | 'error';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const urlError = searchParams.get('error');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus('error');
      return;
    }
    // Where to actually land is decided server-side: the layouts redirect to
    // /login/set-password while the temporary password is still in use, and
    // bounce between /admin and /dashboard by role. refresh() is what lets
    // those server components see the session cookie that was just set.
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label className="visually-hidden" htmlFor="loginEmail">
        Email address
      </label>
      <input
        className="input"
        id="loginEmail"
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        autoComplete="email"
      />
      <label className="visually-hidden" htmlFor="loginPassword">
        Password
      </label>
      <input
        className="input"
        id="loginPassword"
        type="password"
        required
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      <button className="btn btn-primary" type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Signing in…' : 'Sign in'}
      </button>
      {/* Deliberately does not distinguish "no such account" from "wrong
          password" — this page is reachable by anyone who guesses the URL. */}
      {status === 'error' && <p className="card-body">That email and password don&apos;t match. Try again.</p>}
      {status === 'idle' && urlError === 'noprofile' && (
        <p className="card-body">That account isn&apos;t set up yet. Ask an admin to finish creating it.</p>
      )}
    </form>
  );
}
