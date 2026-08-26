import { prisma } from '@/lib/prisma';
import { normalizeReference } from '@/lib/order-reference';

function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

export const dynamic = 'force-dynamic';

export default async function AdminSalesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = normalizeReference(q ?? '');

  const sales = await prisma.sale.findMany({
    // A reference search is how staff find one order from a phone call, so it
    // filters the same table rather than living on a separate page.
    where: query ? { reference: { contains: query } } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      plan: true,
      salesperson: true,
      referralTag: true,
      commissionEvents: { orderBy: { createdAt: 'asc' } },
    },
  });

  const waiting = await prisma.sale.count({ where: { status: 'AWAITING_CALLBACK' } });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, margin: 0 }}>All sales</h1>

      <form method="get" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label className="visually-hidden" htmlFor="orderSearch">
          Find an order by its code
        </label>
        <input
          className="input"
          id="orderSearch"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Find by order code, e.g. K7M2QP"
          style={{ maxWidth: 280 }}
        />
        <button className="btn btn-secondary" type="submit">
          Find
        </button>
        {query && (
          <a className="btn btn-ghost" href="/admin/sales">
            Clear
          </a>
        )}
        <span className="card-body" style={{ marginLeft: 'auto' }}>
          {waiting} awaiting callback
        </span>
      </form>

      {sales.length === 0 ? (
        <p className="card-body">{query ? `No order matches "${query}".` : 'No sales yet.'}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Salesperson</th>
              <th>Referral tag</th>
              <th>Commission</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(sale => {
              const netCommission = sale.commissionEvents.reduce((sum, e) => sum + e.commissionAmount, 0);
              const gross = sale.commissionEvents[0]?.grossAmount ?? 0;
              const hasUnresolvedRule = sale.commissionEvents.some(e => e.commissionRuleId === null && e.eventType !== 'REFUND_REVERSAL');
              return (
                <tr key={sale.id}>
                  <td>
                    <code>{sale.reference}</code>
                  </td>
                  <td>{sale.createdAt.toLocaleDateString()}</td>
                  <td>{sale.plan.name}</td>
                  <td>{gross ? formatCents(gross, sale.currency) : '—'}</td>
                  <td>{sale.salesperson?.displayName ?? sale.salesperson?.email ?? '— (no referral)'}</td>
                  <td>{sale.referralTag?.tag ?? '—'}</td>
                  <td>
                    {sale.salesperson ? formatCents(netCommission, sale.currency) : '—'}
                    {hasUnresolvedRule && (
                      <span className="tag tag-outline" style={{ marginLeft: 8 }}>
                        no rule configured
                      </span>
                    )}
                  </td>
                  <td>{sale.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
          </div>
      )}
    </div>
  );
}
