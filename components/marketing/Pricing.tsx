'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { currencyForLocale } from '@/i18n/routing';

type Interval = 'month' | 'year';

// Display-only amounts — the actual charge always comes from the DB-backed
// PlanPrice -> Stripe Price resolved server-side in /api/checkout, this is
// just what's shown before that request happens. Keep in sync with
// prisma/seed.ts and whatever's configured in Stripe if prices change.
const AMOUNTS = {
  'one-off': { oneTime: 8900 },
  household: { month: 1900, year: 19000 },
  'family-elders': { month: 2900, year: 29000 },
} as const;

function formatAmount(cents: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(cents / 100);
}

function yearlySavingsPercent(monthly: number, yearly: number) {
  return Math.round((1 - yearly / (monthly * 12)) * 100);
}

function PlanButton({
  planKey,
  interval,
  className,
  children,
}: {
  planKey: string;
  interval?: Interval;
  className: string;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const locale = useLocale();

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey, locale, interval }),
      });
      if (!res.ok) throw new Error('checkout request failed');
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch {
      setLoading(false);
      window.location.href = 'tel:18884027714';
    }
  }

  return (
    <button type="button" className={className} onClick={handleClick} disabled={loading}>
      {children}
    </button>
  );
}

export default function Pricing() {
  const t = useTranslations('plans');
  const locale = useLocale();
  const currency = currencyForLocale(locale);
  const [interval, setInterval] = useState<Interval>('month');

  const householdSavings = yearlySavingsPercent(AMOUNTS.household.month, AMOUNTS.household.year);

  return (
    <section className="section" id="plans" aria-label="Plans and pricing">
      <div className="container">
        <span className="kicker reveal-item">{t('kicker')}</span>
        <h2 className="reveal-item">{t('title')}</h2>
        <p className="section-lead reveal-item">{t('subtitle')}</p>

        <div className="reveal-item billing-toggle">
          <div className="seg" role="radiogroup" aria-label="Billing period">
            <label className="seg-opt">
              <input type="radio" name="interval" checked={interval === 'month'} onChange={() => setInterval('month')} />
              {t('billingMonthly')}
            </label>
            <label className="seg-opt">
              <input type="radio" name="interval" checked={interval === 'year'} onChange={() => setInterval('year')} />
              {t('billingYearly', { percent: householdSavings })}
            </label>
          </div>
        </div>

        <div className="reveal-group grid-plans">
          <div className="card elev-sm plan-card">
            <span className="card-kicker">{t('oneOffKicker')}</span>
            <span className="plan-price">{formatAmount(AMOUNTS['one-off'].oneTime, currency, locale)}</span>
            <span className="card-body">{t('oneOffBody')}</span>
            <PlanButton planKey="one-off" className="btn btn-secondary btn-block">
              {t('oneOffCta')}
            </PlanButton>
          </div>

          <div className="card elev-md plan-card plan-card-featured">
            <span className="plan-card-head">
              <span className="card-kicker plan-kicker-featured">{t('householdKicker')}</span>
              <span className="tag tag-accent-2 tag-featured">{t('householdBadge')}</span>
            </span>
            <span className="plan-price">
              {formatAmount(AMOUNTS.household[interval], currency, locale)}
              <span className="plan-period">{interval === 'month' ? t('householdPeriod') : t('yearlyPeriod')}</span>
            </span>
            {interval === 'year' && <span className="plan-savings">{t('billedAnnually')}</span>}
            <span className="card-body">{t('householdBody')}</span>
            <PlanButton planKey="household" interval={interval} className="btn btn-primary btn-block">
              {t('householdCta')}
            </PlanButton>
          </div>

          <div className="card elev-sm plan-card">
            <span className="card-kicker">{t('familyKicker')}</span>
            <span className="plan-price">
              {formatAmount(AMOUNTS['family-elders'][interval], currency, locale)}
              <span className="plan-period">{interval === 'month' ? t('familyPeriod') : t('yearlyPeriod')}</span>
            </span>
            {interval === 'year' && <span className="plan-savings">{t('billedAnnually')}</span>}
            <span className="card-body">{t('familyBody')}</span>
            <PlanButton planKey="family-elders" interval={interval} className="btn btn-secondary btn-block">
              {t('familyCta')}
            </PlanButton>
          </div>
        </div>
      </div>
    </section>
  );
}
