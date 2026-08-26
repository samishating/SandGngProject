import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { getPricing } from '@/lib/pricing';
import { Link } from '@/i18n/navigation';
import CheckoutForm from '@/components/marketing/CheckoutForm';

// Prices are admin-editable and the currency depends on the visitor, so this
// can never be cached.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'checkout' });
  return { title: `${t('title')} — Hearthline`, robots: { index: false } };
}

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string; interval?: string }>;
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { plan: planKey, interval: rawInterval } = await searchParams;

  const t = await getTranslations('checkout');
  const plans = await getTranslations('plans');

  if (!planKey) notFound();

  const plan = await prisma.plan.findUnique({ where: { key: planKey }, include: { prices: true } });
  if (!plan) notFound();

  // A one-off plan has exactly one interval regardless of what the URL says;
  // a recurring plan defaults to monthly if the parameter is missing or junk.
  const interval = plan.isRecurring ? (rawInterval === 'year' ? 'year' : 'month') : 'one_time';
  if (!plan.prices.some(p => p.interval === interval)) notFound();

  const pricing = await getPricing(locale);
  const priced = pricing.plans[plan.key]?.[interval];
  if (!priced) notFound();

  const planName = {
    'one-off': plans('oneOffKicker'),
    household: plans('householdKicker'),
    'family-elders': plans('familyKicker'),
  }[plan.key] ?? plan.name;

  const periodLabel =
    interval === 'one_time' ? plans('oneOffPeriod') : interval === 'year' ? plans('yearlyPeriod') : plans('householdPeriod');

  return (
    <section className="section" aria-label={t('title')}>
      <div className="container" style={{ maxWidth: 820 }}>
        <span className="kicker">{t('kicker')}</span>
        <h1>{t('title')}</h1>
        <p className="section-lead">{t('lead')}</p>

        <div className="checkout-grid">
          <div className="card elev-sm" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="card-kicker">{t('summaryTitle')}</span>
            <span className="card-title">{planName}</span>
            <span className="plan-price">
              {priced.display}
              <span className="plan-period">{periodLabel}</span>
            </span>
            <span className="card-body">
              {interval === 'one_time'
                ? plans('oneOffNote')
                : interval === 'year'
                  ? plans('billedAnnually')
                  : plans('billedMonthly')}
            </span>
            <Link className="btn btn-ghost" href="/pricing">
              {t('changePlan')}
            </Link>
          </div>

          <div>
            <CheckoutForm planKey={plan.key} interval={interval} locale={locale} />
          </div>
        </div>
      </div>
    </section>
  );
}
