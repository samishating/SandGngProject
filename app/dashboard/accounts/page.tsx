import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { findAccounts } from '@/lib/account-search';
import AccountSearchBar from '@/components/shared/AccountSearchBar';
import AccountResults from '@/components/shared/AccountResults';
import CallbackActions from '@/components/dashboard/CallbackActions';

export const dynamic = 'force-dynamic';

function waitingFor(since: Date): string {
  const hours = Math.floor((Date.now() - since.getTime()) / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
}

export default async function AccountFinderPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? '').trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // layout.tsx guarantees this; satisfies TS

  // Scoped to this agent's own customers — see the note in findAccounts.
  const accounts = query ? await findAccounts(query, user.id) : [];

  // With no search running the page shows the callback queue instead of an
  // empty box, so the nav item still answers "who do I need to ring?".
  const waiting = query
    ? []
    : await prisma.sale.findMany({
        where: { salespersonId: user.id, status: 'AWAITING_CALLBACK' },
        orderBy: { createdAt: 'asc' },
        include: { plan: true },
      });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div className="account-search-hero">
        <h1>Find an account</h1>
        <p className="card-body">Search by name, phone number, email address or the order code the customer reads out.</p>
        <AccountSearchBar action="/dashboard/accounts" defaultValue={query} />
      </div>

      {query ? (
        accounts.length === 0 ? (
          <p className="card-body">
            Nothing matches &ldquo;{query}&rdquo;. Only customers who ordered through your links appear here.
          </p>
        ) : (
          <>
            <p className="card-body">
              {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'} found.
            </p>
            <AccountResults accounts={accounts} />
          </>
        )
      ) : (
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, marginBottom: 4 }}>Waiting for a callback</h2>
          <p className="card-body" style={{ marginTop: 0 }}>Orders nobody has phoned yet. Oldest first.</p>

          {waiting.length === 0 ? (
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
                  {waiting.map(o => (
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
                      <td>{o.plan.name}</td>
                      <td>{money(o.amount, o.currency)}</td>
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
        </div>
      )}
    </div>
  );
}
