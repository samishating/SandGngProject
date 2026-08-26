'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InviteSalespersonForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [tag, setTag] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setError('');
    const res = await fetch('/api/admin/salespeople', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, displayName, tag }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Something went wrong.');
      setStatus('error');
      return;
    }
    setEmail('');
    setDisplayName('');
    setTag('');
    setStatus('idle');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card elev-sm" style={{ padding: 24, gap: 14, display: 'flex', flexDirection: 'column' }}>
      <span className="card-title">Invite a salesperson</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <input className="input" type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} />
        <input className="input" type="text" placeholder="Name (optional)" value={displayName} onChange={e => setDisplayName(e.target.value)} />
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
      <div>
        <button className="btn btn-primary" type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Sending invite…' : 'Send invite'}
        </button>
      </div>
      {error && <p className="card-body">{error}</p>}
    </form>
  );
}
