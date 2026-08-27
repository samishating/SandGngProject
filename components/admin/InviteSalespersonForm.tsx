'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TEMP_PASSWORD } from '@/lib/auth-constants';

interface Created {
  email: string;
  username: string | null;
  tempPassword: string;
}

export default function InviteSalespersonForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [tag, setTag] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [error, setError] = useState('');
  const [created, setCreated] = useState<Created | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setError('');
    setCreated(null);

    const res = await fetch('/api/admin/salespeople', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, displayName, tag, username }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Something went wrong.');
      setStatus('error');
      return;
    }

    // Nothing is emailed, so the credentials have to be shown here for the
    // admin to pass on — otherwise the account is created and unreachable.
    const body = (await res.json()) as { profile?: { username: string | null }; tempPassword?: string };
    setCreated({
      email,
      username: body.profile?.username ?? null,
      tempPassword: body.tempPassword ?? TEMP_PASSWORD,
    });

    setEmail('');
    setDisplayName('');
    setUsername('');
    setTag('');
    setStatus('idle');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card elev-sm" style={{ padding: 24, gap: 14, display: 'flex', flexDirection: 'column' }}>
      <span className="card-title">Add a salesperson</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <input className="input" type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} />
        <input className="input" type="text" placeholder="Name (optional)" value={displayName} onChange={e => setDisplayName(e.target.value)} />
        <input
          className="input"
          type="text"
          placeholder="Username (optional)"
          pattern="[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]"
          title="3-30 characters: lowercase letters, numbers, dots, underscores or hyphens"
          value={username}
          onChange={e => setUsername(e.target.value.toLowerCase())}
          autoCapitalize="none"
          spellCheck={false}
        />
        <input
          className="input"
          type="text"
          placeholder="Referral tag (e.g. maria)"
          required
          pattern="[a-z0-9-]{3,32}"
          title="3-32 lowercase letters, numbers or hyphens"
          value={tag}
          onChange={e => setTag(e.target.value.toLowerCase())}
        />
      </div>
      <p className="card-body" style={{ fontSize: 14, opacity: 0.8, margin: 0 }}>
        Leave the username blank to take it from the email address. Nothing is emailed — you pass the sign-in details on
        yourself.
      </p>
      <div>
        <button className="btn btn-primary" type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Creating…' : 'Create account'}
        </button>
      </div>

      {created && (
        <div className="card" style={{ padding: 16, gap: 6, display: 'flex', flexDirection: 'column' }}>
          <span className="card-kicker">Give them these</span>
          <span className="card-body">
            Sign in at <code>/login</code> with{' '}
            <strong>{created.username ?? created.email}</strong> and the password{' '}
            <strong>{created.tempPassword}</strong>. They&apos;ll be asked to choose their own password straight away.
          </span>
        </div>
      )}

      {error && <p className="card-body">{error}</p>}
    </form>
  );
}
