import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // layout.tsx already guarantees this, satisfies TS

  const [totals, sales, tags] = await Promise.all([
    prisma.commissionEvent.groupBy({ by: ['currency'], where: { salespersonId: user.id }, _sum: { commissionAmount: true } }),
    prisma.sale.findMany({ where: { salespersonId: user.id }, orderBy: { createdAt: 'desc' }, include: { plan: true } }),
    prisma.referralTag.findMany({ where: { salespersonId: user.id } }),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, margin: 0 }}>Your sales</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        {totals.length === 0 && (
          <div className="card elev-sm">
            <span className="card-kicker">Earned so far</span>
            <span className="card-body">No commission recorded yet.</span>
          </div>
        )}
        {totals.map(t => (
          <div className="card elev-sm" key={t.currency}>
            <span className="card-kicker">Earned so far ({t.currency.toUpperCase()})</span>
            <span className="plan-price">{formatCents(t._sum.commissionAmount ?? 0, t.currency)}</span>
          </div>
        ))}
      </div>

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
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, marginBottom: 12 }}>Your sales</h2>
        {sales.length === 0 ? (
          <p className="card-body">No sales yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Plan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id}>
                  <td>{s.createdAt.toLocaleDateString()}</td>
                  <td>{s.plan.name}</td>
                  <td>{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
