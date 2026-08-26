import { prisma } from '@/lib/prisma';

function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

export default async function AdminOverviewPage() {
  const [saleCount, commissionTotals, recentSales] = await Promise.all([
    prisma.sale.count(),
    prisma.commissionEvent.groupBy({ by: ['currency'], _sum: { commissionAmount: true } }),
    prisma.sale.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { plan: true, salesperson: true },
    }),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, margin: 0 }}>Overview</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        <div className="card elev-sm">
          <span className="card-kicker">Total sales</span>
          <span className="plan-price">{saleCount}</span>
        </div>
        {commissionTotals.length === 0 && (
          <div className="card elev-sm">
            <span className="card-kicker">Commission owed</span>
            <span className="card-body">No attributed sales yet.</span>
          </div>
        )}
        {commissionTotals.map(t => (
          <div className="card elev-sm" key={t.currency}>
            <span className="card-kicker">Commission owed ({t.currency.toUpperCase()})</span>
            <span className="plan-price">{formatCents(t._sum.commissionAmount ?? 0, t.currency)}</span>
          </div>
        ))}
      </div>

      <div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, marginBottom: 16 }}>Recent sales</h2>
        {recentSales.length === 0 ? (
          <p className="card-body">No sales yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Plan</th>
                <th>Salesperson</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map(sale => (
                <tr key={sale.id}>
                  <td>{sale.createdAt.toLocaleDateString()}</td>
                  <td>{sale.plan.name}</td>
                  <td>{sale.salesperson?.displayName ?? sale.salesperson?.email ?? '—'}</td>
                  <td>{sale.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
