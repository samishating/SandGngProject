'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  priceId: string;
  /** Current price in USD cents. */
  amountUsd: number;
}

/**
 * One row's price editor. Saves USD only — the converted EUR/GBP figures
 * shown alongside it are derived and update on their own.
 */
export default function PlanPriceForm({ priceId, amountUsd }: Props) {
  const router = useRouter();
  const [value, setValue] = useState((amountUsd / 100).toString());
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    const res = await fetch('/api/admin/plan-prices', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId, amountUsd: Number(value) }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus('error');
      setMessage(body.error ?? 'Could not save that price.');
      return;
    }

    setStatus('saved');
    setMessage('Saved.');
    // Pulls the converted columns back down with the new figures.
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span aria-hidden="true">$</span>
      <label className="visually-hidden" htmlFor={`price-${priceId}`}>
        Price in US dollars
      </label>
      <input
        className="input"
        id={`price-${priceId}`}
        type="number"
        min="1"
        step="1"
        required
        value={value}
        onChange={e => {
          setValue(e.target.value);
          setStatus('idle');
          setMessage('');
        }}
        style={{ width: 110 }}
      />
      <button className="btn btn-secondary" type="submit" disabled={status === 'saving'}>
        {status === 'saving' ? 'Saving…' : 'Save'}
      </button>
      {message && (
        <span className="card-body" style={{ color: status === 'error' ? 'var(--color-danger, #b3261e)' : undefined }}>
          {message}
        </span>
      )}
    </form>
  );
}
