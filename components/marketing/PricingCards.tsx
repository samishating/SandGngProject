'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { PricingData } from '@/lib/pricing';

type Interval = 'month' | 'year';

/**
 * The reactive half of the pricing section. Every amount is precomputed and
 * formatted on the server (see lib/pricing.ts) and passed in already converted,
 * so switching billing period is instant and no rate maths ships to the
 * browser.
 *
 * Each CTA carries the chosen plan and billing period into /checkout, which
 * books the order — there is no payment step, a technician calls back to
 * arrange it.
 */
export default function PricingCards({ pricing }: { pricing: PricingData }) {
  const t = useTranslations('plans');
  const [interval, setInterval] = useState<Interval>('month');

  const oneOff = pricing.plans['one-off']?.one_time;
  const household = pricing.plans.household?.[interval];
  const family = pricing.plans['family-elders']?.[interval];

  return (
    <>
      <div className="reveal-item billing-toggle">
        <div className="seg" role="radiogroup" aria-label="Billing period">
          <label className="seg-opt">
            <input type="radio" name="interval" checked={interval === 'month'} onChange={() => setInterval('month')} />
            {t('billingMonthly')}
          </label>
          <label className="seg-opt">
            <input type="radio" name="interval" checked={interval === 'year'} onChange={() => setInterval('year')} />
            {t('billingYearly', { percent: pricing.householdSavings })}
          </label>
        </div>
      </div>

      <div className="reveal-group grid-plans">
        {/* The one-off plan has no billing interval, so the toggle above
            doesn't apply to it. It still renders a period suffix and a note
            line so the three cards keep the same vertical rhythm at either
            toggle state, and so "no subscription" is stated rather than left
            to be inferred from a missing "/ month". */}
        <div className="card elev-sm plan-card">
          <span className="card-kicker">{t('oneOffKicker')}</span>
          <span className="plan-price">
            {oneOff?.display}
            <span className="plan-period">{t('oneOffPeriod')}</span>
          </span>
          <span className="plan-note">{t('oneOffNote')}</span>
          <span className="card-body">{t('oneOffBody')}</span>
          <Link className="btn btn-secondary btn-block" href="/checkout?plan=one-off">
            {t('oneOffCta')}
          </Link>
        </div>

        <div className="card elev-md plan-card plan-card-featured">
          <span className="plan-card-head">
            <span className="card-kicker plan-kicker-featured">{t('householdKicker')}</span>
            <span className="tag tag-accent-2 tag-featured">{t('householdBadge')}</span>
          </span>
          <span className="plan-price">
            {household?.display}
            <span className="plan-period">{interval === 'month' ? t('householdPeriod') : t('yearlyPeriod')}</span>
          </span>
          <span className="plan-note">{interval === 'year' ? t('billedAnnually') : t('billedMonthly')}</span>
          <span className="card-body">{t('householdBody')}</span>
          <Link className="btn btn-primary btn-block" href={`/checkout?plan=household&interval=${interval}`}>
            {t('householdCta')}
          </Link>
        </div>

        <div className="card elev-sm plan-card">
          <span className="card-kicker">{t('familyKicker')}</span>
          <span className="plan-price">
            {family?.display}
            <span className="plan-period">{interval === 'month' ? t('familyPeriod') : t('yearlyPeriod')}</span>
          </span>
          <span className="plan-note">{interval === 'year' ? t('billedAnnually') : t('billedMonthly')}</span>
          <span className="card-body">{t('familyBody')}</span>
          <Link className="btn btn-secondary btn-block" href={`/checkout?plan=family-elders&interval=${interval}`}>
            {t('familyCta')}
          </Link>
        </div>
      </div>
    </>
  );
}
