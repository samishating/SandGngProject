import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
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

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  const period = parseMonthKey(month);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // layout.tsx already guarantees this, satisfies TS

  // Earnings are counted by calendar month — 1st to the last day, whether that
  // is 28, 29, 30 or 31 — so a month's total matches one payslip. `end` is the
  // first instant of the next month, hence `lt`.
  const window = { gte: period.start, lt: period.end };

  const [monthTotals, allTimeTotals, sales, tags] = await Promise.all([
    prisma.commissionEvent.groupBy({
      by: ['currency'],
      where: { salespersonId: user.id, createdAt: window },
      _sum: { commissionAmount: true },
    }),
    prisma.commissionEvent.groupBy({
      by: ['currency'],
      where: { salespersonId: user.id },
      _sum: { commissionAmount: true },
    }),
    prisma.sale.findMany({
      where: { salespersonId: user.id, createdAt: window },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    }),
    prisma.referralTag.findMany({ where: { salespersonId: user.id } }),
  ]);

  const soldThisMonth = sales.filter(s => s.status === 'ACTIVE').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, margin: 0 }}>Your sales</h1>
          <p className="card-body" style={{ margin: '6px 0 0' }}>
            {period.label} · {day(period.start)} to {day(new Date(period.end.getTime() - 86_400_000))}
          </p>
        </div>
        <MonthPicker action="/dashboard" selected={period.key} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        {monthTotals.length === 0 ? (
          <div className="card elev-sm">
            <span className="card-kicker">Earned in {period.label}</span>
            <span className="card-body">Nothing recorded this month.</span>
          </div>
        ) : (
          monthTotals.map(t => (
            <div className="card elev-sm" key={t.currency}>
              <span className="card-kicker">
                Earned in {period.label} ({t.currency.toUpperCase()})
              </span>
              <span className="plan-price">{formatCents(t._sum.commissionAmount ?? 0, t.currency)}</span>
            </div>
          ))
        )}
        <div className="card elev-sm">
          <span className="card-kicker">Sold this month</span>
          <span className="plan-price">{soldThisMonth}</span>
          <span className="card-body">of {sales.length} order{sales.length === 1 ? '' : 's'} placed</span>
        </div>
      </div>

      {allTimeTotals.length > 0 && (
        <p className="card-body">
          All time: {allTimeTotals.map(t => formatCents(t._sum.commissionAmount ?? 0, t.currency)).join(' + ')}
        </p>
      )}

      <div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, marginBottom: 12 }}>Your referral links</h2>
        {tags.length === 0 ? (
          <p className="card-body">No referral tags assigned yet — ask your admin.</p>
        ) : (
          <div className="tag-row">
            {tags.map(t => (
              <span key={t.id} className={`tag ${t.isActive ? 'tag-accent' : 'tag-neutral'}`}>
                ?ref={t.tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, marginBottom: 12 }}>Orders in {period.label}</h2>
        {sales.length === 0 ? (
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
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id}>
                    <td>
                      <code>{s.reference}</code>
                    </td>
                    <td>{day(s.createdAt)}</td>
                    <td>{s.customerName ?? '—'}</td>
                    <td>{s.plan.name}</td>
                    <td>{formatCents(s.amount, s.currency)}</td>
                    <td>{STATUS_LABELS[s.status] ?? s.status}</td>
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
