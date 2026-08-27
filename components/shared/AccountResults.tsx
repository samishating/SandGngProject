import type { Account } from '@/lib/account-search';
import { daysUntil } from '@/lib/billing-period';

const INTERVAL_LABELS: Record<string, string> = {
  one_time: 'One-off',
  month: 'Monthly',
  year: 'Yearly',
};

const STATUS_LABELS: Record<string, string> = {
  AWAITING_CALLBACK: 'Awaiting callback',
  ACTIVE: 'Active',
  CANCELED: 'Cancelled',
  REFUNDED: 'Refunded',
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function day(date: Date) {
  return date.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Everything known about one customer. Server component — it only formats what
 * findAccounts already resolved.
 */
export default function AccountResults({ accounts }: { accounts: Account[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {accounts.map(account => {
        const sub = account.currentSubscription;
        const remaining = sub?.periodEnd ? daysUntil(sub.periodEnd) : null;

        return (
          <div key={account.email + account.lastOrderAt.toISOString()} className="card elev-sm" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <span className="card-title">{account.name ?? 'Unnamed customer'}</span>
              <p className="card-body" style={{ margin: '4px 0 0' }}>
                {account.email}
                {account.phone && (
                  <>
                    {' · '}
                    <a href={`tel:${account.phone.replace(/\s/g, '')}`}>{account.phone}</a>
                  </>
                )}
              </p>
            </div>

            <div className="account-facts">
              <div className="account-fact">
                <span className="card-kicker">Current subscription</span>
                <span className="account-fact-value">{sub ? `${sub.planName} · ${INTERVAL_LABELS[sub.interval] ?? sub.interval}` : 'None'}</span>
              </div>
              <div className="account-fact">
                <span className="card-kicker">Renews / ends</span>
                <span className="account-fact-value">
                  {sub?.periodEnd ? day(sub.periodEnd) : '—'}
                  {remaining !== null && (
                    // Overdue is worth flagging: it means a renewal was missed,
                    // not that the customer is fine.
                    <span className="card-body" style={{ display: 'block', fontSize: 13 }}>
                      {remaining >= 0 ? `in ${remaining} day${remaining === 1 ? '' : 's'}` : `${Math.abs(remaining)} days overdue`}
                    </span>
                  )}
                </span>
              </div>
              <div className="account-fact">
                <span className="card-kicker">Paid to date</span>
                <span className="account-fact-value">
                  {account.paidByCurrency.length === 0
                    ? '—'
                    : account.paidByCurrency.map(p => money(p.total, p.currency)).join(' + ')}
                </span>
              </div>
              <div className="account-fact">
                <span className="card-kicker">Customer since</span>
                <span className="account-fact-value">{day(account.firstOrderAt)}</span>
              </div>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Plan</th>
                    <th>Billing</th>
                    <th>Amount</th>
                    <th>Placed</th>
                    <th>Term</th>
                    <th>Status</th>
                    <th>Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {account.orders.map(o => (
                    <tr key={o.id}>
                      <td>
                        <code>{o.reference}</code>
                      </td>
                      <td>{o.planName}</td>
                      <td>{INTERVAL_LABELS[o.interval] ?? o.interval}</td>
                      <td>{money(o.amount, o.currency)}</td>
                      <td>{day(o.createdAt)}</td>
                      <td>{o.periodStart && o.periodEnd ? `${day(o.periodStart)} – ${day(o.periodEnd)}` : '—'}</td>
                      <td>{STATUS_LABELS[o.status] ?? o.status}</td>
                      <td>{o.salespersonName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {account.orders.some(o => o.note) && (
              <div>
                <span className="card-kicker">Notes</span>
                {account.orders
                  .filter(o => o.note)
                  .map(o => (
                    <p className="card-body" key={o.id} style={{ margin: '4px 0 0' }}>
                      <code>{o.reference}</code> — {o.note}
                    </p>
                  ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
