'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddTagForm({ salespersonId }: { salespersonId: string }) {
  const router = useRouter();
  const [tag, setTag] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setError('');
    const res = await fetch('/api/admin/referral-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ salespersonId, tag }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Something went wrong.');
      setStatus('error');
      return;
    }
    setTag('');
    setStatus('idle');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        className="input"
        style={{ maxWidth: 220 }}
        type="text"
        placeholder="New tag"
        required
        pattern="[a-z0-9-]{3,32}"
        value={tag}
        onChange={e => setTag(e.target.value.toLowerCase())}
      />
      <button className="btn btn-secondary" type="submit" disabled={status === 'saving'}>
        Add tag
      </button>
      {error && <span className="card-body">{error}</span>}
    </form>
  );
}
