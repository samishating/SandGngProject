'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

type NoteState = 'default' | 'success' | 'error';

export default function CtaForm() {
  const t = useTranslations('cta');
  const emailRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [noteState, setNoteState] = useState<NoteState>('default');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = emailRef.current;
    if (!email || !email.checkValidity()) {
      email?.reportValidity();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/callback-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.value.trim(), company: companyRef.current?.value ?? '' }),
      });
      if (!res.ok) throw new Error('request failed');
      setNoteState('success');
      email.value = '';
    } catch {
      setNoteState('error');
    } finally {
      setSubmitting(false);
      setTimeout(() => setNoteState('default'), 6000);
    }
  }

  return (
    <>
      <form className="cta-form" onSubmit={handleSubmit} noValidate>
        <label className="visually-hidden" htmlFor="ctaEmail">
          {t('emailPlaceholder')}
        </label>
        <input className="input" id="ctaEmail" ref={emailRef} type="email" placeholder={t('emailPlaceholder')} required autoComplete="email" />
        <input className="visually-hidden" type="text" name="company" ref={companyRef} tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {t('submit')}
        </button>
      </form>
      <p className={`cta-note${noteState === 'success' ? ' is-confirmed' : ''}${noteState === 'error' ? ' is-error' : ''}`}>
        {noteState === 'success' ? (
          t('success')
        ) : noteState === 'error' ? (
          t('error')
        ) : (
          <>
            {t('noteBefore')} <a href={`tel:${t('phone').replace(/[^0-9+]/g, '')}`}>{t('phone')}</a> {t('noteAfter')}
          </>
        )}
      </p>
    </>
  );
}
