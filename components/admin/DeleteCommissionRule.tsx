'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Removes a commission rule. Confirms first, because the effect is immediate:
 * once it's gone the salesperson's next sale resolves against whatever rule is
 * left, or records zero commission if none is.
 *
 * The server decides whether this is an outright delete or a deactivation
 * (see the DELETE handler) — a rule that already produced payouts keeps its
 * row so that history stays explicable. The message reports which happened
 * rather than claiming "deleted" either way.
 */
export default function DeleteCommissionRule({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'working' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleClick() {
    if (!confirm(`Remove the ${label} commission rule? It stops applying to new sales straight away.`)) return;

    setStatus('working');
    const res = await fetch(`/api/admin/commission-rules?id=${encodeURIComponent(id)}`, { method: 'DELETE' });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus('error');
      setMessage(body.error ?? 'Could not remove that rule.');
      return;
    }

    const { outcome, usageCount } = (await res.json()) as { outcome: string; usageCount: number };
    if (outcome === 'deactivated') {
      // Worth saying out loud: the row is still in the database, and the
      // admin should understand why it didn't simply vanish.
      alert(
        `Rule stopped. It was kept on record rather than deleted, because ${usageCount} recorded ` +
          `commission ${usageCount === 1 ? 'payment references' : 'payments reference'} it. It no longer applies to new sales.`,
      );
    }
    router.refresh();
  }

  return (
    <>
      <button className="btn btn-ghost" type="button" onClick={handleClick} disabled={status === 'working'}>
        {status === 'working' ? 'Removing…' : 'Remove'}
      </button>
      {status === 'error' && <span className="card-body">{message}</span>}
    </>
  );
}
