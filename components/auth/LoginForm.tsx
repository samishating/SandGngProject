'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Status = 'idle' | 'submitting' | 'error';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const urlError = searchParams.get('error');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');

    // Signed in server-side so a username can be resolved to an email without
    // exposing that mapping to the browser — see /api/auth/sign-in.
    const res = await fetch('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus('error');
      setMessage(body.error ?? "That didn't match an account. Check and try again.");
      return;
    }

    // Where to land is decided by the server, which knows the role and whether
    // the temporary password is still in use. An explicit ?next= wins, but the
    // layouts still gate it.
    const { destination } = (await res.json()) as { destination?: string };
    router.replace(next || destination || '/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label className="visually-hidden" htmlFor="loginIdentifier">
        Username or email address
      </label>
      <input
        className="input"
        id="loginIdentifier"
        type="text"
        required
        placeholder="Username or email"
        value={identifier}
        onChange={e => setIdentifier(e.target.value)}
        // "username" rather than "email": the field accepts either, and
        // password managers offer the saved handle for it.
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
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
      {/* Deliberately doesn't distinguish "no such account" from "wrong
          password" — this page is reachable by anyone who guesses the URL. */}
      {status === 'error' && <p className="card-body">{message}</p>}
      {status === 'idle' && urlError === 'noprofile' && (
        <p className="card-body">That account isn&apos;t set up yet. Ask an admin to finish creating it.</p>
      )}
      {status === 'idle' && urlError === 'inactive' && (
        <p className="card-body">That account has been closed. Speak to an admin if you think that&apos;s wrong.</p>
      )}
    </form>
  );
}
