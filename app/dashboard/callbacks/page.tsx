import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import CallbackActions from '@/components/dashboard/CallbackActions';

// A queue is only useful if it's current.
export const dynamic = 'force-dynamic';

function waitingFor(since: Date): string {
  const hours = Math.floor((Date.now() - since.getTime()) / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
}

export default async function CallbacksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // layout.tsx guarantees this; satisfies TS

  const orders = await prisma.sale.findMany({
    where: { salespersonId: user.id, status: 'AWAITING_CALLBACK' },
    // Oldest first: the person who has been waiting longest gets called first.
    orderBy: { createdAt: 'asc' },
    include: { plan: true },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, margin: 0 }}>Waiting for a callback</h1>
        <p className="card-body" style={{ margin: '6px 0 0' }}>
          Orders placed through your links that nobody has phoned yet. Oldest first.
        </p>
      </div>

      {orders.length === 0 ? (
        <p className="card-body">Nothing waiting — you&apos;re all caught up.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Plan</th>
              <th>Value</th>
              <th>Placed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td>
                  <code>{o.reference}</code>
                </td>
                <td>
                  {o.customerName ?? '—'}
                  {o.customerEmail && (
                    <>
                      <br />
                      <span className="card-body" style={{ fontSize: 13 }}>
                        {o.customerEmail}
                      </span>
                    </>
                  )}
                </td>
                <td>{o.customerPhone ? <a href={`tel:${o.customerPhone.replace(/\s/g, '')}`}>{o.customerPhone}</a> : '—'}</td>
                <td>
                  {o.plan.name}
                  <br />
                  <span className="card-body" style={{ fontSize: 13 }}>
                    {o.mode === 'SUBSCRIPTION' ? 'Subscription' : 'One-off'}
                  </span>
                </td>
                <td>{formatCents(o.amount, o.currency)}</td>
                <td>{waitingFor(o.createdAt)}</td>
                <td>
                  <CallbackActions saleId={o.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          </div>
      )}

      {orders.some(o => o.note) && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, marginBottom: 12 }}>Notes from customers</h2>
          {orders
            .filter(o => o.note)
            .map(o => (
              <p className="card-body" key={o.id}>
                <code>{o.reference}</code> — {o.note}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
