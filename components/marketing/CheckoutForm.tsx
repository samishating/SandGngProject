'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  planKey: string;
  interval: string;
  locale: string;
}

type Status = 'idle' | 'submitting' | 'done' | 'error';

/**
 * Collects the customer's details and books the order. There is no payment
 * step — a technician calls back to arrange the session and take payment, so
 * this deliberately never asks for card details.
 */
export default function CheckoutForm({ planKey, interval, locale }: Props) {
  const t = useTranslations('checkout');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

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
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus('error');
      setMessage(body.error ?? t('error'));
      return;
    }

    setStatus('done');
  }

  if (status === 'done') {
    return (
      <div className="card elev-sm" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="card-title">{t('successTitle')}</span>
        <span className="card-body">{t('successBody')}</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        {status === 'submitting' ? t('submitting') : t('submit')}
      </button>
      <span className="card-body" style={{ fontSize: 14, opacity: 0.8 }}>
        {t('reassurance')}
      </span>
      {status === 'error' && <p className="card-body">{message}</p>}
    </form>
  );
}
