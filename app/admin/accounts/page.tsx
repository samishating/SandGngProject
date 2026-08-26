import { prisma } from '@/lib/prisma';
import { findAccounts } from '@/lib/account-search';
import AccountSearchBar from '@/components/shared/AccountSearchBar';
import AccountResults from '@/components/shared/AccountResults';

export const dynamic = 'force-dynamic';

export default async function AdminAccountFinderPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? '').trim();

  // No salesperson id — an admin searches every customer, not one agent's book.
  const accounts = query ? await findAccounts(query) : [];
  const waiting = query ? 0 : await prisma.sale.count({ where: { status: 'AWAITING_CALLBACK' } });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div className="account-search-hero">
        <h1>Find an account</h1>
        <p className="card-body">Search every customer by name, phone number, email address or order code.</p>
        <AccountSearchBar action="/admin/accounts" defaultValue={query} />
      </div>

      {query ? (
        accounts.length === 0 ? (
          <p className="card-body">Nothing matches &ldquo;{query}&rdquo;.</p>
        ) : (
          <>
            <p className="card-body">
              {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'} found.
            </p>
            <AccountResults accounts={accounts} />
          </>
        )
      ) : (
        <p className="card-body">
          {waiting > 0
            ? `${waiting} order${waiting === 1 ? '' : 's'} awaiting a callback — see Sales for the full list.`
            : 'Type a name, number, email or order code above.'}
        </p>
      )}
    </div>
  );
}
