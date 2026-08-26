import { prisma } from '@/lib/prisma';
import { getRates } from '@/lib/exchange-rates';
import { convertFromUsd, formatMoney } from '@/lib/currency';
import PlanPriceForm from '@/components/admin/PlanPriceForm';

// Prices and rates both change out of band, so never serve this from cache.
export const dynamic = 'force-dynamic';

const INTERVAL_LABELS: Record<string, string> = {
  one_time: 'Per session',
  month: 'Monthly',
  year: 'Yearly',
};

export default async function AdminPlansPage() {
  const [plans, rates] = await Promise.all([
    prisma.plan.findMany({ include: { prices: true }, orderBy: { key: 'asc' } }),
    getRates(),
  ]);

  const rateRows = await prisma.exchangeRate.findMany({ orderBy: { currency: 'asc' } });
  const lastRefreshed = rateRows[0];

  return (
    <>
      <h1>Prices</h1>
      <p className="card-body" style={{ maxWidth: 640 }}>
        Set every price in US dollars. Euro and pound figures are converted from
        the daily exchange rate and rounded to a whole unit — they update on
        their own and can&apos;t be edited directly.
      </p>

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

      {plans.map(plan => (
        <div key={plan.id} className="card elev-sm" style={{ padding: 20, marginBottom: 20 }}>
          <span className="card-title">{plan.name}</span>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th style={{ padding: '8px 0' }}>Billing</th>
                <th style={{ padding: '8px 0' }}>Price (USD)</th>
                <th style={{ padding: '8px 0' }}>Euro</th>
                <th style={{ padding: '8px 0' }}>Pound</th>
              </tr>
            </thead>
            <tbody>
              {plan.prices
                .slice()
                .sort((a, b) => a.interval.localeCompare(b.interval))
                .map(price => (
                  <tr key={price.id}>
                    <td style={{ padding: '8px 0' }}>{INTERVAL_LABELS[price.interval] ?? price.interval}</td>
                    <td style={{ padding: '8px 0' }}>
                      <PlanPriceForm priceId={price.id} amountUsd={price.amountUsd} />
                    </td>
                    <td style={{ padding: '8px 0' }}>{formatMoney(convertFromUsd(price.amountUsd, 'eur', rates.eur), 'eur', 'en')}</td>
                    <td style={{ padding: '8px 0' }}>{formatMoney(convertFromUsd(price.amountUsd, 'gbp', rates.gbp), 'gbp', 'en')}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}
