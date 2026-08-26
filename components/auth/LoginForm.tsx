'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Status = 'idle' | 'sending' | 'sent' | 'error';

// What GoTrue returns for "no such user, and I'm not allowed to create one".
// Current versions answer otp_disabled ("Signups not allowed for otp"); the
// others are accepted too so a server-side version bump can't silently turn
// a normal typo into a scary error message.
const NOT_REGISTERED_CODES = new Set(['otp_disabled', 'signup_disabled', 'user_not_found']);

export default function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const urlError = searchParams.get('error');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        // Accounts are only ever created by an admin (the invite flow, or
        // scripts/create-admin.ts). Without this, signInWithOtp defaults to
        // creating a user for whatever address is typed — so anyone who found
        // this unlinked URL could mint themselves an auth user.
        shouldCreateUser: false,
      },
    });
    // Deliberately reports success either way. With shouldCreateUser off, an
    // unregistered address comes back as an error, and surfacing that would
    // turn this page into an account enumeration oracle; the link simply
    // never arrives instead. Genuine faults (rate limits, provider outages)
    // still show the failure, since those are worth acting on.
    if (error && !NOT_REGISTERED_CODES.has(error.code ?? '')) {
      setStatus('error');
      return;
    }
    setStatus('sent');
  }

  if (status === 'sent') {
    return <p className="card-body">If that address has an account, a sign-in link is on its way.</p>;
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
      <button className="btn btn-primary" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send sign-in link'}
      </button>
      {status === 'error' && <p className="card-body">Something went wrong sending the link. Try again.</p>}
      {status === 'idle' && urlError === 'noprofile' && (
        <p className="card-body">
          That account isn&apos;t set up yet. Ask an admin to finish creating it.
        </p>
      )}
      {status === 'idle' && urlError === 'auth' && (
        <p className="card-body">That sign-in link has expired or was already used. Request a new one.</p>
      )}
    </form>
  );
}
