import { prisma } from '@/lib/prisma';

function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

export default async function AdminSalesPage() {
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      plan: true,
      salesperson: true,
      referralTag: true,
      commissionEvents: { orderBy: { createdAt: 'asc' } },
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, margin: 0 }}>All sales</h1>

      {sales.length === 0 ? (
        <p className="card-body">No sales yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
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
      )}
    </div>
  );
}
