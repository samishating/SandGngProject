'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface PlanEditorPrice {
  id: string;
  interval: string;
  amountUsd: number;
  eur: string;
  gbp: string;
}

export interface PlanEditorPlan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  badge: string | null;
  isRecurring: boolean;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  translations: Record<string, Record<string, string>>;
  prices: PlanEditorPrice[];
  saleCount: number;
}

const INTERVAL_LABELS: Record<string, string> = {
  one_time: 'Per session',
  month: 'Monthly',
  year: 'Yearly',
};

/**
 * One plan's full editor: wording, ordering, visibility, per-interval prices
 * and per-locale overrides. Everything saves through /api/admin/plans or
 * /api/admin/plan-prices, both of which revalidate the marketing pages.
 */
export default function PlanEditor({ plan, locales }: { plan: PlanEditorPlan; locales: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? '');
  const [badge, setBadge] = useState(plan.badge ?? '');
  const [sortOrder, setSortOrder] = useState(String(plan.sortOrder));
  const [translations, setTranslations] = useState(plan.translations);

  function report(text: string, failed = false) {
    setMessage(text);
    setIsError(failed);
  }

  async function send(payload: Record<string, unknown>) {
    setBusy(true);
    report('');
    const res = await fetch('/api/admin/plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: plan.id, ...payload }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      report(body.error ?? 'Could not save.', true);
      return false;
    }
    report('Saved.');
    router.refresh();
    return true;
  }

  function setTranslationField(locale: string, field: string, value: string) {
    setTranslations(prev => ({ ...prev, [locale]: { ...(prev[locale] ?? {}), [field]: value } }));
  }

  async function removePlan() {
    const warning =
      plan.saleCount > 0
        ? `${plan.name} has ${plan.saleCount} order${plan.saleCount === 1 ? '' : 's'} behind it, so it will be retired rather than deleted. Continue?`
        : `Delete ${plan.name}? Nothing references it, so it will be removed outright.`;
    if (!confirm(warning)) return;

    setBusy(true);
    const res = await fetch(`/api/admin/plans?id=${plan.id}`, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) {
      report('Could not remove that plan.', true);
      return;
    }
    const { outcome } = (await res.json()) as { outcome: string };
    if (outcome === 'retired') {
      alert('Plan retired. It is off the pricing page but kept on record because orders reference it.');
    }
    router.refresh();
  }

  return (
    <div className="card elev-sm" style={{ padding: 20, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span className="card-title">{plan.name}</span>
        <code style={{ opacity: 0.7 }}>{plan.key}</code>
        {plan.isFeatured && <span className="tag tag-accent-2">Featured</span>}
        <span className={`tag ${plan.isActive ? 'tag-accent' : 'tag-neutral'}`}>{plan.isActive ? 'Live' : 'Hidden'}</span>
        <button className="btn btn-ghost" type="button" onClick={() => setOpen(o => !o)} style={{ marginLeft: 'auto' }}>
          {open ? 'Close' : 'Edit'}
        </button>
      </div>

      <PriceTable plan={plan} onDone={() => router.refresh()} />

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid rgba(0,0,0,.08)', paddingTop: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="card-kicker">Name</span>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="card-kicker">Description shown on the card</span>
            <textarea className="input" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
          </label>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="card-kicker">Badge (blank for none)</span>
              <input className="input" value={badge} onChange={e => setBadge(e.target.value)} placeholder="Most chosen" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="card-kicker">Order</span>
              <input
                className="input"
                type="number"
                step="10"
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
                style={{ width: 100 }}
              />
            </label>
          </div>

          <details>
            <summary className="card-kicker" style={{ cursor: 'pointer' }}>
              Translations — anything left blank falls back to the English above
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
              {locales.map(locale => (
                <div key={locale} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="card-kicker">{locale.toUpperCase()}</span>
                  <input
                    className="input"
                    placeholder="Name"
                    value={translations[locale]?.name ?? ''}
                    onChange={e => setTranslationField(locale, 'name', e.target.value)}
                  />
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Description"
                    value={translations[locale]?.description ?? ''}
                    onChange={e => setTranslationField(locale, 'description', e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Badge"
                    value={translations[locale]?.badge ?? ''}
                    onChange={e => setTranslationField(locale, 'badge', e.target.value)}
                  />
                </div>
              ))}
            </div>
          </details>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              type="button"
              disabled={busy}
              onClick={() =>
                send({ name, description, badge, sortOrder: Number(sortOrder), translations })
              }
            >
              {busy ? 'Saving…' : 'Save wording'}
            </button>
            <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => send({ isActive: !plan.isActive })}>
              {plan.isActive ? 'Hide from site' : 'Make live'}
            </button>
            {!plan.isFeatured && (
              <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => send({ isFeatured: true })}>
                Make featured
              </button>
            )}
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={removePlan}>
              Remove
            </button>
            {message && (
              <span className="card-body" style={{ color: isError ? '#b3261e' : undefined }}>
                {message}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Per-interval prices, with add and remove. */
function PriceTable({ plan, onDone }: { plan: PlanEditorPlan; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [newInterval, setNewInterval] = useState('month');
  const [newAmount, setNewAmount] = useState('');

  const taken = new Set(plan.prices.map(p => p.interval));
  const available = (plan.isRecurring ? ['month', 'year'] : ['one_time']).filter(i => !taken.has(i));

  async function addPrice() {
    setBusy(true);
    setError('');
    const res = await fetch('/api/admin/plan-prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: plan.id, interval: newInterval, amountUsd: Number(newAmount) }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Could not add that price.');
      return;
    }
    setNewAmount('');
    onDone();
  }

  async function removePrice(id: string, label: string) {
    if (!confirm(`Remove the ${label} price?`)) return;
    setBusy(true);
    setError('');
    const res = await fetch(`/api/admin/plan-prices?id=${id}`, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Could not remove that price.');
      return;
    }
    onDone();
  }

  return (
    <div>
      {plan.prices.length === 0 ? (
        <p className="card-body">No price set yet — this plan can&apos;t go live until it has one.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Billing</th>
                <th>Price (USD)</th>
                <th>Euro</th>
                <th>Pound</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {plan.prices.map(price => (
                <tr key={price.id}>
                  <td>{INTERVAL_LABELS[price.interval] ?? price.interval}</td>
                  <td>
                    <PriceField priceId={price.id} amountUsd={price.amountUsd} onDone={onDone} />
                  </td>
                  <td>{price.eur}</td>
                  <td>{price.gbp}</td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      disabled={busy}
                      onClick={() => removePrice(price.id, INTERVAL_LABELS[price.interval] ?? price.interval)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {available.length > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          <select className="input" value={newInterval} onChange={e => setNewInterval(e.target.value)} style={{ width: 150 }}>
            {available.map(i => (
              <option key={i} value={i}>
                {INTERVAL_LABELS[i]}
              </option>
            ))}
          </select>
          <span aria-hidden="true">$</span>
          <input
            className="input"
            type="number"
            min="1"
            step="1"
            value={newAmount}
            onChange={e => setNewAmount(e.target.value)}
            placeholder="19"
            style={{ width: 110 }}
            aria-label="New price in US dollars"
          />
          <button className="btn btn-secondary" type="button" disabled={busy || !newAmount} onClick={addPrice}>
            Add price
          </button>
        </div>
      )}
      {error && <p className="card-body" style={{ color: '#b3261e' }}>{error}</p>}
    </div>
  );
}

function PriceField({ priceId, amountUsd, onDone }: { priceId: string; amountUsd: number; onDone: () => void }) {
  const [value, setValue] = useState((amountUsd / 100).toString());
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState('saving');
    const res = await fetch('/api/admin/plan-prices', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId, amountUsd: Number(value) }),
    });
    setState(res.ok ? 'saved' : 'error');
    if (res.ok) onDone();
  }

  return (
    <form onSubmit={save} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span aria-hidden="true">$</span>
      <input
        className="input"
        type="number"
        min="1"
        step="1"
        required
        value={value}
        onChange={e => {
          setValue(e.target.value);
          setState('idle');
        }}
        style={{ width: 100 }}
        aria-label="Price in US dollars"
      />
      <button className="btn btn-secondary" type="submit" disabled={state === 'saving'}>
        {state === 'saving' ? '…' : 'Save'}
      </button>
      {state === 'saved' && <span className="card-body">Saved</span>}
      {state === 'error' && <span className="card-body" style={{ color: '#b3261e' }}>Failed</span>}
    </form>
  );
}
