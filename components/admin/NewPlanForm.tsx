'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Creates a plan. It starts hidden — a plan with no price would render a card
 * with a blank where the money goes, so the API refuses to publish one until
 * a price exists.
 */
export default function NewPlanForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);
  const [monthly, setMonthly] = useState('');
  const [yearly, setYearly] = useState('');
  const [oneOff, setOneOff] = useState('');

  /** Slug follows the name until the admin edits it themselves. */
  function onNameChange(value: string) {
    setName(value);
    if (!keyTouched) {
      setKey(
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 41),
      );
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');

    const prices = isRecurring
      ? [
          { interval: 'month', amountUsd: Number(monthly) },
          { interval: 'year', amountUsd: Number(yearly) },
        ].filter(p => Number.isFinite(p.amountUsd) && p.amountUsd > 0)
      : [{ interval: 'one_time', amountUsd: Number(oneOff) }].filter(p => Number.isFinite(p.amountUsd) && p.amountUsd > 0);

    const res = await fetch('/api/admin/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, name, description, isRecurring, prices }),
    });
    setBusy(false);

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Could not create that plan.');
      return;
    }

    setName('');
    setKey('');
    setKeyTouched(false);
    setDescription('');
    setMonthly('');
    setYearly('');
    setOneOff('');
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button className="btn btn-primary" type="button" onClick={() => setOpen(true)}>
        Add a plan
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card elev-sm" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span className="card-title">New plan</span>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="card-kicker">Name</span>
        <input className="input" required value={name} onChange={e => onNameChange(e.target.value)} placeholder="Business" />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="card-kicker">Key — appears in the link, can&apos;t be changed later</span>
        <input
          className="input"
          required
          value={key}
          onChange={e => {
            setKeyTouched(true);
            setKey(e.target.value.toLowerCase());
          }}
          placeholder="business"
          pattern="[a-z0-9][a-z0-9-]{1,40}"
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="card-kicker">Description shown on the card</span>
        <textarea className="input" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
      </label>

      <div className="seg" role="radiogroup" aria-label="Billing type" style={{ alignSelf: 'flex-start' }}>
        <label className="seg-opt">
          <input type="radio" name="billingType" checked={isRecurring} onChange={() => setIsRecurring(true)} />
          Subscription
        </label>
        <label className="seg-opt">
          <input type="radio" name="billingType" checked={!isRecurring} onChange={() => setIsRecurring(false)} />
          One-off
        </label>
      </div>

      {isRecurring ? (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="card-kicker">Monthly (USD)</span>
            <input className="input" type="number" min="1" step="1" value={monthly} onChange={e => setMonthly(e.target.value)} style={{ width: 130 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="card-kicker">Yearly (USD)</span>
            <input className="input" type="number" min="1" step="1" value={yearly} onChange={e => setYearly(e.target.value)} style={{ width: 130 }} />
          </label>
        </div>
      ) : (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="card-kicker">Price per session (USD)</span>
          <input className="input" type="number" min="1" step="1" value={oneOff} onChange={e => setOneOff(e.target.value)} style={{ width: 130 }} />
        </label>
      )}

      <p className="card-body" style={{ fontSize: 14, opacity: 0.8 }}>
        Created hidden. Set a price, then use &ldquo;Make live&rdquo; to put it on the pricing page.
      </p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create plan'}
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
        {error && <span className="card-body" style={{ color: '#b3261e' }}>{error}</span>}
      </div>
    </form>
  );
}
