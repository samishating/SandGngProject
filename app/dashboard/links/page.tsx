import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { routing } from '@/i18n/routing';
import LinkBuilder, { type LinkBuilderPlan } from '@/components/dashboard/LinkBuilder';

export const dynamic = 'force-dynamic';

export default async function DashboardLinksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // layout.tsx guarantees this; satisfies TS

  const [tags, plans] = await Promise.all([
    prisma.referralTag.findMany({ where: { salespersonId: user.id }, orderBy: { createdAt: 'asc' } }),
    prisma.plan.findMany({ include: { prices: true }, orderBy: { key: 'asc' } }),
  ]);

  const builderPlans: LinkBuilderPlan[] = plans.map(p => ({
    key: p.key,
    name: p.name,
    isRecurring: p.isRecurring,
    // Sorted so monthly reads before yearly rather than alphabetically by
    // whatever order the rows came back in.
    intervals: p.prices
      .map(price => price.interval)
      .sort((a, b) => ['one_time', 'month', 'year'].indexOf(a) - ['one_time', 'month', 'year'].indexOf(b)),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, margin: 0 }}>Your links</h1>
        <p className="card-body" style={{ margin: '6px 0 0' }}>
          A link per plan, tagged to you. Send the one that matches what the customer wants and the order lands in your
          callbacks queue.
        </p>
      </div>

      <LinkBuilder
        plans={builderPlans}
        tags={tags.map(t => ({ tag: t.tag, isActive: t.isActive }))}
        locales={[...routing.locales]}
        defaultLocale={routing.defaultLocale}
      />
    </div>
  );
}
