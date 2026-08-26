import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import InviteSalespersonForm from '@/components/admin/InviteSalespersonForm';

export default async function AdminSalespeoplePage() {
  const salespeople = await prisma.profile.findMany({
    where: { role: 'SALESPERSON' },
    orderBy: { createdAt: 'desc' },
    include: { referralTags: true },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, margin: 0 }}>Salespeople</h1>

      <InviteSalespersonForm />

      {salespeople.length === 0 ? (
        <p className="card-body">No salespeople yet — invite one above.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Referral tags</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {salespeople.map(sp => (
              <tr key={sp.id}>
                <td>{sp.displayName ?? '—'}</td>
                <td>{sp.email}</td>
                <td>
                  {sp.referralTags.length === 0
                    ? '—'
                    : sp.referralTags.map(t => (
                        <span key={t.id} className={`tag ${t.isActive ? 'tag-accent' : 'tag-neutral'}`} style={{ marginRight: 6 }}>
                          {t.tag}
                        </span>
                      ))}
                </td>
                <td>
                  <Link href={`/admin/salespeople/${sp.id}`}>Manage</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
