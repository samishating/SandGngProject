// Simulated payment step. Only exists when NEXT_PUBLIC_TEST_CHECKOUT=1 —
// otherwise it 404s, so a real customer can never reach a page that asks for a
// card and takes no money.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { formatMoney, isCurrency } from '@/lib/currency';
import { normalizeReference } from '@/lib/order-reference';
import { testCheckoutEnabled } from '@/lib/test-checkout';
import TestPaymentForm from '@/components/marketing/TestPaymentForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Test payment — Hearthline',
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string }>;
}

export default async function TestPaymentPage({ params, searchParams }: Props) {
  if (!testCheckoutEnabled()) notFound();

  const { locale } = await params;
  const { ref } = await searchParams;
  const reference = normalizeReference(ref ?? '');
  if (!reference) notFound();

  const sale = await prisma.sale.findUnique({ where: { reference }, include: { plan: true } });
  if (!sale) notFound();

  const currency = isCurrency(sale.currency) ? sale.currency : 'usd';

  return (
    <section className="section" aria-label="Test payment">
      <div className="container" style={{ maxWidth: 520 }}>
        <TestPaymentForm reference={sale.reference} amount={formatMoney(sale.amount, currency, locale)} />
      </div>
    </section>
  );
}
