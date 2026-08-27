'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Removes a salesperson. The server decides whether that means deleting them
 * or deactivating them — someone with sales behind them keeps their row so the
 * commission history still points at a name — and the confirmation says which
 * it will be before anything happens.
 */
export default function RemoveSalesperson({ id, name, saleCount }: { id: string; name: string; saleCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    const warning =
      saleCount > 0
        ? `${name} has ${saleCount} order${saleCount === 1 ? '' : 's'} on record, so they'll be deactivated rather than deleted: they can't sign in, their links stop crediting them, and their past sales stay in the books. Continue?`
        : `Delete ${name}? They have no sales, so the account, their links and their sign-in are removed for good.`;
    if (!confirm(warning)) return;

    setBusy(true);
    setError('');
    const res = await fetch(`/api/admin/salespeople?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    setBusy(false);

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Could not remove that account.');
      return;
    }

    const body = (await res.json()) as { outcome: string; warning?: string };
    if (body.warning) alert(body.warning);
    else if (body.outcome === 'deactivated') {
      alert(`${name} has been deactivated. Their sales history is kept; they can no longer sign in.`);
    }
    router.refresh();
  }

  return (
    <>
      <button className="btn btn-ghost" type="button" onClick={handleClick} disabled={busy}>
        {busy ? 'Removing…' : 'Remove'}
      </button>
      {error && <span className="card-body">{error}</span>}
    </>
  );
}
