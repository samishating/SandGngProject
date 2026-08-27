import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import InviteSalespersonForm from '@/components/admin/InviteSalespersonForm';
import RemoveSalesperson from '@/components/admin/RemoveSalesperson';

export const dynamic = 'force-dynamic';

export default async function AdminSalespeoplePage() {
  const salespeople = await prisma.profile.findMany({
    where: { role: 'SALESPERSON' },
    // Active first, then most recent — a list of leavers shouldn't push the
    // people who are actually working down the page.
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    include: { referralTags: true, _count: { select: { sales: true } } },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, margin: 0 }}>Salespeople</h1>

      <InviteSalespersonForm />

      {salespeople.length === 0 ? (
        <p className="card-body">No salespeople yet — add one above.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Sign in with</th>
                <th>Referral tags</th>
                <th>Sales</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {salespeople.map(sp => (
                <tr key={sp.id} style={sp.isActive ? undefined : { opacity: 0.55 }}>
                  <td>
                    {sp.displayName ?? '—'}
                    {!sp.isActive && (
                      <>
                        {' '}
                        <span className="tag tag-neutral">Removed</span>
                      </>
                    )}
                  </td>
                  <td>
                    {sp.username ?? sp.email}
                    {sp.username && (
                      <>
                        <br />
                        <span className="card-body" style={{ fontSize: 13 }}>
                          {sp.email}
                        </span>
                      </>
                    )}
                  </td>
                  <td>
                    {sp.referralTags.length === 0
                      ? '—'
                      : sp.referralTags.map(t => (
                          <span key={t.id} className={`tag ${t.isActive ? 'tag-accent' : 'tag-neutral'}`} style={{ marginRight: 6 }}>
                            {t.tag}
                          </span>
                        ))}
                  </td>
                  <td>{sp._count.sales}</td>
                  {/* The actions live in a wrapper, not on the td itself:
                      making the cell a flex container drops it out of the
                      row's shared baseline and it stops lining up with the
                      other columns. */}
                  <td>
                    <div className="row-actions">
                      <Link className="btn btn-secondary btn-sm" href={`/admin/salespeople/${sp.id}`}>
                        Manage
                      </Link>
                      {sp.isActive && (
                        <RemoveSalesperson
                          id={sp.id}
                          name={sp.displayName ?? sp.email}
                          saleCount={sp._count.sales}
                          tagCount={sp.referralTags.length}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
