import { prisma } from '@/lib/prisma';
import { attributionLabel } from '@/lib/attribution';
import { parseMonthKey } from '@/lib/billing-period';
import MonthPicker from '@/components/shared/MonthPicker';

export const dynamic = 'force-dynamic';

function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

function day(date: Date) {
  return date.toLocaleDateString('en', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

const STATUS_LABELS: Record<string, string> = {
  AWAITING_CALLBACK: 'Awaiting callback',
  ACTIVE: 'Active',
  CANCELED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  const period = parseMonthKey(month);

  // Calendar month, 1st to last day — the same window the agents' dashboards
  // use, so a payout reconciles against what they were shown.
  const window = { gte: period.start, lt: period.end };

  const [monthSales, monthTotals, perAgent, waiting, salespeople] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: window },
      orderBy: { createdAt: 'desc' },
      include: { plan: true, salesperson: true },
    }),
    prisma.commissionEvent.groupBy({
      by: ['currency'],
      where: { createdAt: window },
      _sum: { commissionAmount: true },
    }),
    prisma.commissionEvent.groupBy({
      by: ['salespersonId', 'currency'],
      where: { createdAt: window },
      _sum: { commissionAmount: true },
      _count: { _all: true },
    }),
    prisma.sale.count({ where: { status: 'AWAITING_CALLBACK' } }),
    prisma.profile.findMany({ where: { role: 'SALESPERSON' }, select: { id: true, displayName: true, email: true } }),
  ]);

  const nameFor = new Map(salespeople.map(p => [p.id, p.displayName ?? p.email]));
  const sold = monthSales.filter(s => s.status === 'ACTIVE').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, margin: 0 }}>Overview</h1>
          <p className="card-body" style={{ margin: '6px 0 0' }}>
            {period.label} · {day(period.start)} to {day(new Date(period.end.getTime() - 86_400_000))}
          </p>
        </div>
        <MonthPicker action="/admin" selected={period.key} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        <div className="card elev-sm">
          <span className="card-kicker">Orders in {period.label}</span>
          <span className="plan-price">{monthSales.length}</span>
          <span className="card-body">{sold} sold</span>
        </div>
        {monthTotals.length === 0 ? (
          <div className="card elev-sm">
            <span className="card-kicker">Commission this month</span>
            <span className="card-body">Nothing attributed yet.</span>
          </div>
        ) : (
          monthTotals.map(t => (
            <div className="card elev-sm" key={t.currency}>
              <span className="card-kicker">Commission this month ({t.currency.toUpperCase()})</span>
              <span className="plan-price">{formatCents(t._sum.commissionAmount ?? 0, t.currency)}</span>
            </div>
          ))
        )}
        <div className="card elev-sm">
          <span className="card-kicker">Awaiting callback</span>
          <span className="plan-price">{waiting}</span>
          <span className="card-body">across all agents, all time</span>
        </div>
      </div>

      <div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, marginBottom: 4 }}>Payable for {period.label}</h2>
        <p className="card-body" style={{ marginTop: 0 }}>What each agent earned in this pay period.</p>
        {perAgent.length === 0 ? (
          <p className="card-body">Nothing to pay out this month.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Salesperson</th>
                  <th>Events</th>
                  <th>Currency</th>
                  <th>Commission</th>
                </tr>
              </thead>
              <tbody>
                {perAgent.map(row => (
                  <tr key={`${row.salespersonId}-${row.currency}`}>
                    <td>{nameFor.get(row.salespersonId) ?? '—'}</td>
                    <td>{row._count._all}</td>
                    <td>{row.currency.toUpperCase()}</td>
                    <td>{formatCents(row._sum.commissionAmount ?? 0, row.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, marginBottom: 16 }}>Orders in {period.label}</h2>
        {monthSales.length === 0 ? (
          <p className="card-body">No orders placed this month.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Salesperson</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {monthSales.map(sale => (
                  <tr key={sale.id}>
                    <td>
                      <code>{sale.reference}</code>
                    </td>
                    <td>{day(sale.createdAt)}</td>
                    <td>{sale.customerName ?? '—'}</td>
                    <td>{sale.plan.name}</td>
                    <td>{formatCents(sale.amount, sale.currency)}</td>
                    <td>{attributionLabel(sale.salesperson)}</td>
                    <td>{STATUS_LABELS[sale.status] ?? sale.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
