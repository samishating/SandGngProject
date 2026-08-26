'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Plan {
  id: string;
  name: string;
}

export default function CommissionRuleForm({ salespersonId, plans }: { salespersonId: string; plans: Plan[] }) {
  const router = useRouter();
  const [scope, setScope] = useState<'SALESPERSON_DEFAULT' | 'PLAN_SPECIFIC'>('SALESPERSON_DEFAULT');
  const [planId, setPlanId] = useState(plans[0]?.id ?? '');
  const [type, setType] = useState<'PERCENTAGE' | 'FLAT'>('PERCENTAGE');
  const [currency, setCurrency] = useState<'usd' | 'eur'>('usd');
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setError('');
    const numericValue = Number(value);
    const res = await fetch('/api/admin/commission-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        salespersonId,
        scope,
        planId: scope === 'PLAN_SPECIFIC' ? planId : undefined,
        type,
        currency: type === 'FLAT' ? currency : undefined,
        // FLAT is stored in cents; the admin enters a whole-currency amount.
        value: type === 'FLAT' ? Math.round(numericValue * 100) : numericValue,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Something went wrong.');
      setStatus('error');
      return;
    }
    setValue('');
    setStatus('idle');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card elev-sm" style={{ padding: 24, gap: 14, display: 'flex', flexDirection: 'column' }}>
      <span className="card-title">Set a commission rule</span>

      <div className="seg" role="radiogroup" aria-label="Rule scope">
        <label className="seg-opt">
          <input type="radio" checked={scope === 'SALESPERSON_DEFAULT'} onChange={() => setScope('SALESPERSON_DEFAULT')} />
          Default (all plans)
        </label>
        <label className="seg-opt">
          <input type="radio" checked={scope === 'PLAN_SPECIFIC'} onChange={() => setScope('PLAN_SPECIFIC')} />
          Specific plan
        </label>
      </div>

      {scope === 'PLAN_SPECIFIC' && (
        <select className="input" value={planId} onChange={e => setPlanId(e.target.value)}>
          {plans.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      <div className="seg" role="radiogroup" aria-label="Commission type">
        <label className="seg-opt">
          <input type="radio" checked={type === 'PERCENTAGE'} onChange={() => setType('PERCENTAGE')} />
          Percentage
        </label>
        <label className="seg-opt">
          <input type="radio" checked={type === 'FLAT'} onChange={() => setType('FLAT')} />
          Flat fee
        </label>
      </div>

      {type === 'FLAT' && (
        <select className="input" value={currency} onChange={e => setCurrency(e.target.value as 'usd' | 'eur')}>
          <option value="usd">USD</option>
          <option value="eur">EUR</option>
        </select>
      )}

      <input
        className="input"
        type="number"
        min="0"
        step="0.01"
        required
        placeholder={type === 'PERCENTAGE' ? 'e.g. 10 for 10%' : 'e.g. 15.00'}
        value={value}
        onChange={e => setValue(e.target.value)}
      />

      <div>
        <button className="btn btn-primary" type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save rule'}
        </button>
      </div>
      {error && <p className="card-body">{error}</p>}
    </form>
  );
}
