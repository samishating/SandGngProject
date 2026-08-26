'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Resolves one waiting order. "Sold" means the callback happened and the plan
 * is running; "Didn't take" closes it off without charging anything.
 */
export default function CallbackActions({ saleId }: { saleId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function set(status: 'ACTIVE' | 'CANCELED') {
    if (status === 'CANCELED' && !confirm('Close this order as not taken?')) return;
    setBusy(true);
    setError('');

    const res = await fetch('/api/sales/callback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saleId, status }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Could not update that order.');
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <button className="btn btn-primary" type="button" disabled={busy} onClick={() => set('ACTIVE')}>
        Sold
      </button>
      <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => set('CANCELED')}>
        Didn&apos;t take
      </button>
      {error && <span className="card-body">{error}</span>}
    </div>
  );
}
