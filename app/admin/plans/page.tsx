import { prisma } from '@/lib/prisma';
import { getRates } from '@/lib/exchange-rates';
import { convertFromUsd, formatMoney } from '@/lib/currency';
import { routing } from '@/i18n/routing';
import PlanEditor, { type PlanEditorPlan } from '@/components/admin/PlanEditor';
import NewPlanForm from '@/components/admin/NewPlanForm';

// Prices, rates and plan copy all change out of band.
export const dynamic = 'force-dynamic';

const INTERVAL_ORDER = ['one_time', 'month', 'year'];

export default async function AdminPlansPage() {
  const [plans, rates, rateRows] = await Promise.all([
    prisma.plan.findMany({
      include: { prices: true, _count: { select: { sales: true } } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    getRates(),
    prisma.exchangeRate.findMany({ orderBy: { currency: 'asc' } }),
  ]);

  const lastRefreshed = rateRows[0];

  const editorPlans: PlanEditorPlan[] = plans.map(plan => ({
    id: plan.id,
    key: plan.key,
    name: plan.name,
    description: plan.description,
    badge: plan.badge,
    isRecurring: plan.isRecurring,
    isFeatured: plan.isFeatured,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
    translations: (plan.translations as Record<string, Record<string, string>> | null) ?? {},
    saleCount: plan._count.sales,
    prices: plan.prices
      .slice()
      .sort((a, b) => INTERVAL_ORDER.indexOf(a.interval) - INTERVAL_ORDER.indexOf(b.interval))
      .map(price => ({
        id: price.id,
        interval: price.interval,
        amountUsd: price.amountUsd,
        eur: formatMoney(convertFromUsd(price.amountUsd, 'eur', rates.eur), 'eur', 'en'),
        gbp: formatMoney(convertFromUsd(price.amountUsd, 'gbp', rates.gbp), 'gbp', 'en'),
      })),
  }));

  // The base columns hold the default locale, so only the others are editable
  // as overrides.
  const translatableLocales = routing.locales.filter(l => l !== routing.defaultLocale);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1>Plans</h1>
          <p className="card-body" style={{ maxWidth: 640 }}>
            Everything on the pricing page comes from here — wording, order, and price. Set prices in US dollars; euro and
            pound figures are converted from the daily rate and rounded to a whole unit.
          </p>
        </div>
        <NewPlanForm />
      </div>

      <div className="card elev-sm" style={{ padding: 20, margin: '24px 0' }}>
        <span className="card-kicker">Exchange rates</span>
        {rateRows.length === 0 ? (
          <span className="card-body">
            No rates stored yet — the site is using built-in fallback figures until the first refresh runs.
          </span>
        ) : (
          <span className="card-body">
            {rateRows.map(r => `$1 = ${Number(r.rate).toFixed(4)} ${r.currency.toUpperCase()}`).join('  ·  ')}
            {lastRefreshed && ` · ${lastRefreshed.rateDate}, via ${lastRefreshed.source}`}
          </span>
        )}
        <span className="card-body" style={{ opacity: 0.7 }}>
          Refreshed automatically every day at 06:00 UTC.
        </span>
      </div>

      {editorPlans.length === 0 ? (
        <p className="card-body">No plans yet — add one to get the pricing page working.</p>
      ) : (
        editorPlans.map(plan => <PlanEditor key={plan.id} plan={plan} locales={translatableLocales} />)
      )}
    </>
  );
}
