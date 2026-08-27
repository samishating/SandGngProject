'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { testCheckoutEnabled } from '@/lib/test-checkout';

interface Props {
  planKey: string;
  interval: string;
  locale: string;
  /** The ?ref= on this checkout URL, or null. Credits the agent whose link
      produced this order — nothing is remembered between visits. */
  referralTag: string | null;
}

type Status = 'idle' | 'submitting' | 'done' | 'error';

/**
 * Collects the customer's details and books the order. There is no payment
 * step — a technician calls back to arrange the session and take payment, so
 * this deliberately never asks for card details.
 */
export default function CheckoutForm({ planKey, interval, locale, referralTag }: Props) {
  const t = useTranslations('checkout');
  const router = useRouter();
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState('');

  // Paying by card is only on offer when there is actually a payment step to
  // send people to. Without one the only honest option is a callback.
  const canPayNow = testCheckoutEnabled();
  const [method, setMethod] = useState<'card' | 'callback'>(canPayNow ? 'card' : 'callback');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus('submitting');

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planKey,
        interval,
        locale,
        name: form.get('name'),
        email: form.get('email'),
        phone: form.get('phone'),
        note: form.get('note'),
        company: form.get('company'),
        ref: referralTag,
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus('error');
      setMessage(body.error ?? t('error'));
      return;
    }

    const body = (await res.json()) as { reference?: string };
    const ref = body.reference ?? '';

    // Straight on to the card page when they chose to pay — showing a
    // "we'll call you" confirmation first would contradict what they picked.
    if (method === 'card' && canPayNow && ref) {
      router.push(`/${locale}/checkout/pay?ref=${ref}`);
      return;
    }

    setReference(ref);
    setStatus('done');
  }

  if (status === 'done') {
    return (
      <div className="card elev-sm" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="card-title">{t('successTitle')}</span>
        {reference && (
          <>
            <span className="card-kicker">{t('referenceLabel')}</span>
            <span className="order-reference">{reference}</span>
            <span className="card-body">{t('referenceHint')}</span>
          </>
        )}
        <span className="card-body">{t('successBody')}</span>
        {/* They chose a callback, but the option to pay now is still there —
            people change their mind once the order is real. */}
        {canPayNow && reference && (
          <Link className="btn btn-secondary" href={`/checkout/pay?ref=${reference}`}>
            {t('payNowInstead')}
          </Link>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {canPayNow && (
        <fieldset className="pay-choice">
          <legend className="card-kicker">{t('methodLegend')}</legend>
          <label className={`pay-choice-opt ${method === 'card' ? 'is-selected' : ''}`}>
            <input type="radio" name="method" checked={method === 'card'} onChange={() => setMethod('card')} />
            <span>
              <strong>{t('methodCard')}</strong>
              <small>{t('methodCardHint')}</small>
            </span>
          </label>
          <label className={`pay-choice-opt ${method === 'callback' ? 'is-selected' : ''}`}>
            <input type="radio" name="method" checked={method === 'callback'} onChange={() => setMethod('callback')} />
            <span>
              <strong>{t('methodCallback')}</strong>
              <small>{t('methodCallbackHint')}</small>
            </span>
          </label>
        </fieldset>
      )}

      <label className="visually-hidden" htmlFor="orderName">
        {t('namePlaceholder')}
      </label>
      <input className="input" id="orderName" name="name" required placeholder={t('namePlaceholder')} autoComplete="name" />

      <label className="visually-hidden" htmlFor="orderEmail">
        {t('emailPlaceholder')}
      </label>
      <input className="input" id="orderEmail" name="email" type="email" required placeholder={t('emailPlaceholder')} autoComplete="email" />

      <label className="visually-hidden" htmlFor="orderPhone">
        {t('phonePlaceholder')}
      </label>
      <input className="input" id="orderPhone" name="phone" type="tel" required placeholder={t('phonePlaceholder')} autoComplete="tel" />

      <label className="visually-hidden" htmlFor="orderNote">
        {t('notePlaceholder')}
      </label>
      <textarea className="input" id="orderNote" name="note" rows={3} placeholder={t('notePlaceholder')} />

      {/* Honeypot: hidden from people, irresistible to bots. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />

      <button className="btn btn-primary btn-block" type="submit" disabled={status === 'submitting'}>
        {status === 'submitting'
          ? t('submitting')
          : method === 'card' && canPayNow
            ? t('submitCard')
            : t('submit')}
      </button>
      <span className="card-body" style={{ fontSize: 14, opacity: 0.8 }}>
        {method === 'card' && canPayNow ? t('reassuranceCard') : t('reassurance')}
      </span>
      {status === 'error' && <p className="card-body">{message}</p>}
    </form>
  );
}
