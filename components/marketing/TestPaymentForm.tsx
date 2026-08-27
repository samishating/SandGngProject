'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { TEST_CARD_NUMBER, isTestCard } from '@/lib/test-checkout';

type Status = 'idle' | 'paying' | 'paid' | 'error';

/**
 * A payment form that takes no payment.
 *
 * The card number is validated in the browser and then thrown away — the
 * request to the server carries only the order reference. Nothing about a
 * card is transmitted, logged or stored anywhere, which is the only reason a
 * form shaped like this is acceptable to have in the codebase at all.
 *
 * Only the standard test PAN is accepted. A real card typed in by mistake is
 * refused rather than quietly appearing to work, so nobody can come away
 * believing they paid.
 */
export default function TestPaymentForm({ reference, amount }: { reference: string; amount: string }) {
  const [card, setCard] = useState(TEST_CARD_NUMBER);
  const [expiry, setExpiry] = useState('12 / 30');
  const [cvc, setCvc] = useState('123');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [paidUntil, setPaidUntil] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isTestCard(card)) {
      setStatus('error');
      setMessage(`This is a simulator, not a real checkout. Only the test card ${TEST_CARD_NUMBER} is accepted — never enter a real card number here.`);
      return;
    }

    setStatus('paying');
    setMessage('');

    // Only the reference goes to the server. The card fields never leave this
    // component.
    const res = await fetch('/api/orders/simulate-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus('error');
      setMessage(body.error ?? 'The simulated payment failed.');
      return;
    }

    const body = (await res.json()) as { periodEnd?: string | null };
    setPaidUntil(body.periodEnd ? new Date(body.periodEnd).toLocaleDateString('en', { dateStyle: 'medium' }) : null);
    setStatus('paid');
  }

  if (status === 'paid') {
    return (
      <div className="card elev-sm test-pay-card">
        <span className="card-title">Payment simulated</span>
        <p className="card-body">
          Order <code>{reference}</code> is now active{paidUntil ? `, running to ${paidUntil}` : ''}. It has left the
          callback queue and its commission has been recorded — check the admin overview and the agent&apos;s dashboard.
        </p>
        <Link className="btn btn-secondary" href="/pricing">
          Back to plans
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card elev-sm test-pay-card">
      <div className="test-pay-banner" role="status">
        <strong>Test mode — no payment is taken</strong>
        <span>This page is a simulator for checking the order flow. Never enter a real card number.</span>
      </div>

      <div className="test-pay-amount">
        <span className="card-kicker">Order {reference}</span>
        <span className="plan-price">{amount}</span>
      </div>

      <label className="test-pay-field">
        <span className="card-kicker">Card number</span>
        <input className="input" value={card} onChange={e => setCard(e.target.value)} inputMode="numeric" autoComplete="off" />
      </label>

      <div className="field-row">
        <label className="test-pay-field">
          <span className="card-kicker">Expiry</span>
          <input className="input" value={expiry} onChange={e => setExpiry(e.target.value)} autoComplete="off" style={{ width: 120 }} />
        </label>
        <label className="test-pay-field">
          <span className="card-kicker">CVC</span>
          <input className="input" value={cvc} onChange={e => setCvc(e.target.value)} autoComplete="off" style={{ width: 100 }} />
        </label>
      </div>

      <button className="btn btn-primary btn-block" type="submit" disabled={status === 'paying'}>
        {status === 'paying' ? 'Processing…' : `Pay ${amount} (simulated)`}
      </button>

      {status === 'error' && <p className="card-body test-pay-error">{message}</p>}
    </form>
  );
}
