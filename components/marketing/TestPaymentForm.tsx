'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { TEST_CARD_NUMBER, isTestCard } from '@/lib/test-checkout';

type Status = 'idle' | 'paying' | 'paid' | 'error';

/**
 * A card payment page that takes no payment.
 *
 * It looks like a card form because the point is to see the real flow, but
 * nothing about a card is transmitted, logged or stored — the request to the
 * server carries only the order reference. That is the only reason a form
 * shaped like this belongs in the codebase at all.
 *
 * Only the standard test PAN is accepted, so a real card typed in by mistake
 * is refused rather than appearing to work and leaving someone believing they
 * have paid.
 */
export default function TestPaymentForm({
  reference,
  amount,
  planName,
  period,
}: {
  reference: string;
  amount: string;
  planName: string;
  period: string;
}) {
  const [card, setCard] = useState(TEST_CARD_NUMBER);
  const [holder, setHolder] = useState('');
  const [expiry, setExpiry] = useState('12/30');
  const [cvc, setCvc] = useState('123');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [paidUntil, setPaidUntil] = useState<string | null>(null);

  /** Groups digits in fours as they're typed, the way a card reads. */
  function onCardChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 19);
    setCard(digits.replace(/(.{4})/g, '$1 ').trim());
    setStatus('idle');
  }

  function onExpiryChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    setExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isTestCard(card)) {
      setStatus('error');
      setMessage(
        `This is a demo checkout, not a real one. Only the test card ${TEST_CARD_NUMBER} is accepted — never enter a real card number here.`,
      );
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
      setMessage(body.error ?? 'The demo payment failed.');
      return;
    }

    const body = (await res.json()) as { periodEnd?: string | null };
    setPaidUntil(body.periodEnd ? new Date(body.periodEnd).toLocaleDateString('en', { dateStyle: 'medium' }) : null);
    setStatus('paid');
  }

  if (status === 'paid') {
    return (
      <div className="card elev-md pay-panel">
        <span className="pay-tick" aria-hidden="true">
          ✓
        </span>
        <span className="card-title">Payment complete</span>
        <p className="card-body">
          Order <code>{reference}</code> is active{paidUntil ? `, running to ${paidUntil}` : ''}. A technician will be in
          touch to get you set up.
        </p>
        <p className="card-body" style={{ fontSize: 13, opacity: 0.75 }}>
          Demo mode — no money changed hands.
        </p>
        <Link className="btn btn-secondary" href="/pricing">
          Back to plans
        </Link>
      </div>
    );
  }

  return (
    <div className="pay-layout">
      <div className="card elev-sm pay-summary">
        <span className="card-kicker">Order {reference}</span>
        <span className="card-title">{planName}</span>
        <span className="plan-price">{amount}</span>
        <span className="plan-note">{period}</span>
      </div>

      <form onSubmit={handleSubmit} className="card elev-md pay-panel">
        <div className="test-pay-banner" role="status">
          <strong>Demo checkout — no payment is taken</strong>
          <span>
            Use the test card <code>{TEST_CARD_NUMBER}</code>. Never enter a real card number.
          </span>
        </div>

        {/* Mirrors what's typed, so the page reads as a card checkout rather
            than a form. Purely decorative — the values live in state above. */}
        <div className="card-visual" aria-hidden="true">
          <span className="card-visual-chip" />
          <span className="card-visual-number">{card || '•••• •••• •••• ••••'}</span>
          <div className="card-visual-row">
            <span>
              <small>Card holder</small>
              {holder || 'YOUR NAME'}
            </span>
            <span>
              <small>Expires</small>
              {expiry || 'MM/YY'}
            </span>
          </div>
        </div>

        <label className="pay-field">
          <span className="card-kicker">Card number</span>
          <input
            className="input"
            value={card}
            onChange={e => onCardChange(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="4242 4242 4242 4242"
          />
        </label>

        <label className="pay-field">
          <span className="card-kicker">Name on card</span>
          <input
            className="input"
            value={holder}
            onChange={e => setHolder(e.target.value.toUpperCase())}
            autoComplete="off"
            placeholder="A. TECHNICIAN"
          />
        </label>

        <div className="field-row">
          <label className="pay-field">
            <span className="card-kicker">Expiry</span>
            <input
              className="input"
              value={expiry}
              onChange={e => onExpiryChange(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              placeholder="MM/YY"
              style={{ width: 120 }}
            />
          </label>
          <label className="pay-field">
            <span className="card-kicker">CVC</span>
            <input
              className="input"
              value={cvc}
              onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              autoComplete="off"
              placeholder="123"
              style={{ width: 100 }}
            />
          </label>
        </div>

        <button className="btn btn-primary btn-block" type="submit" disabled={status === 'paying'}>
          {status === 'paying' ? 'Processing…' : `Pay ${amount}`}
        </button>

        {status === 'error' && <p className="card-body test-pay-error">{message}</p>}

        <Link className="btn btn-ghost btn-block" href="/#callback">
          Rather have someone call you instead?
        </Link>
      </form>
    </div>
  );
}
