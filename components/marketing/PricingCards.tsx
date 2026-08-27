'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { PricedPlan, PricingData } from '@/lib/pricing';

type Interval = 'month' | 'year';

/**
 * The reactive half of the pricing section. Every amount is precomputed and
 * formatted on the server (see lib/pricing.ts) and passed in already converted,
 * so switching billing period is instant and no rate maths ships to the
 * browser.
 *
 * Cards are generated from the plans in the database rather than written out
 * one by one — adding an offer or reworking its wording is an edit at
 * /admin/plans, not a code change plus five locale files.
 *
 * Each CTA carries the chosen plan and billing period into /checkout, which
 * books the order; there is no payment step, a technician calls back.
 */
export default function PricingCards({ pricing, referralTag = null }: { pricing: PricingData; referralTag?: string | null }) {
  const t = useTranslations('plans');
  const [interval, setInterval] = useState<Interval>('month');

  // Only meaningful if something on the page actually has both.
  const anyRecurring = pricing.list.some(p => p.isRecurring && p.prices.year && p.prices.month);

  return (
    <>
      {anyRecurring && (
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
      )}

      <div className="reveal-group grid-plans">
        {pricing.list.map(plan => (
          <PlanCard key={plan.key} plan={plan} interval={interval} referralTag={referralTag} />
        ))}
      </div>
    </>
  );
}

function PlanCard({ plan, interval, referralTag }: { plan: PricedPlan; interval: Interval; referralTag: string | null }) {
  const t = useTranslations('plans');

  // A one-off has a single price and ignores the toggle entirely. A recurring
  // plan that only has one of the two intervals falls back to whichever exists,
  // so a half-configured plan still shows a price rather than a gap.
  const resolved = plan.isRecurring
    ? (plan.prices[interval] ?? plan.prices.month ?? plan.prices.year)
    : (plan.prices.one_time ?? Object.values(plan.prices)[0]);
  if (!resolved) return null;

  const activeInterval = plan.isRecurring ? (plan.prices[interval] ? interval : plan.prices.month ? 'month' : 'year') : 'one_time';

  const period =
    activeInterval === 'one_time' ? t('oneOffPeriod') : activeInterval === 'year' ? t('yearlyPeriod') : t('householdPeriod');
  const note =
    activeInterval === 'one_time' ? t('oneOffNote') : activeInterval === 'year' ? t('billedAnnually') : t('billedMonthly');

  // The tag rides along to checkout, where it's read once. Nothing persists
  // between visits, so a customer who arrives without one counts for nobody.
  const params = new URLSearchParams({ plan: plan.key });
  if (plan.isRecurring) params.set('interval', activeInterval);
  if (referralTag) params.set('ref', referralTag);
  const href = `/checkout?${params.toString()}`;

  return (
    <div className={`card plan-card ${plan.isFeatured ? 'elev-md plan-card-featured' : 'elev-sm'}`}>
      {plan.badge ? (
        <span className="plan-card-head">
          <span className={`card-kicker ${plan.isFeatured ? 'plan-kicker-featured' : ''}`}>{plan.name}</span>
          <span className="tag tag-accent-2 tag-featured">{plan.badge}</span>
        </span>
      ) : (
        <span className="card-kicker">{plan.name}</span>
      )}

      <span className="plan-price">
        {resolved.display}
        {/* Period and note keep the three cards on the same vertical rhythm at
            either toggle state, and state "no subscription" rather than
            leaving it to be inferred from a missing "/ month". */}
        <span className="plan-period">{period}</span>
      </span>
      <span className="plan-note">{note}</span>
      {plan.description && <span className="card-body">{plan.description}</span>}

      <Link className={`btn btn-block ${plan.isFeatured ? 'btn-primary' : 'btn-secondary'}`} href={href}>
        {t('cta')}
      </Link>
    </div>
  );
}
