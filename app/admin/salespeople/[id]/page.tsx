import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AddTagForm from '@/components/admin/AddTagForm';
import TagToggle from '@/components/admin/TagToggle';
import CommissionRuleForm from '@/components/admin/CommissionRuleForm';

function formatRuleValue(type: 'PERCENTAGE' | 'FLAT', value: unknown, currency: string | null) {
  const n = Number(value);
  if (type === 'PERCENTAGE') return `${n}%`;
  return new Intl.NumberFormat('en', { style: 'currency', currency: currency ?? 'usd' }).format(n / 100);
}

export default async function SalespersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [salesperson, plans] = await Promise.all([
    prisma.profile.findUnique({
      where: { id, role: 'SALESPERSON' },
      include: {
        referralTags: { orderBy: { createdAt: 'asc' } },
        commissionRules: { where: { isActive: true }, orderBy: { createdAt: 'desc' }, include: { plan: true } },
      },
    }),
    prisma.plan.findMany({ orderBy: { createdAt: 'asc' } }),
  ]);

  if (!salesperson) notFound();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, margin: 0 }}>{salesperson.displayName ?? salesperson.email}</h1>
        <p className="card-body" style={{ margin: '6px 0 0' }}>
          {salesperson.email}
        </p>
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, margin: 0 }}>Referral tags</h2>
        {salesperson.referralTags.length === 0 ? (
          <p className="card-body">No tags yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Tag</th>
                <th>Link</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {salesperson.referralTags.map(t => (
                <tr key={t.id}>
                  <td>{t.tag}</td>
                  <td>?ref={t.tag}</td>
                  <td>{t.isActive ? 'Active' : 'Inactive'}</td>
                  <td>
                    <TagToggle id={t.id} isActive={t.isActive} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <AddTagForm salespersonId={salesperson.id} />
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, margin: 0 }}>Active commission rules</h2>
        {salesperson.commissionRules.length === 0 ? (
          <p className="card-body">No rules configured — sales for this salesperson will record $0/€0 commission until one is set.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Scope</th>
                <th>Type</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {salesperson.commissionRules.map(r => (
                <tr key={r.id}>
                  <td>{r.scope === 'PLAN_SPECIFIC' ? r.plan?.name : 'Default (all plans)'}</td>
                  <td>{r.type === 'FLAT' ? `Flat (${r.currency?.toUpperCase()})` : 'Percentage'}</td>
                  <td>{formatRuleValue(r.type, r.value, r.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <CommissionRuleForm salespersonId={salesperson.id} plans={plans} />
      </section>
    </div>
  );
}
