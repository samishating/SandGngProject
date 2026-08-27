import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Pricing from '@/components/marketing/Pricing';
import ScrollFx from '@/components/marketing/ScrollFx';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const [meta, plans] = await Promise.all([
    getTranslations({ locale, namespace: 'meta' }),
    getTranslations({ locale, namespace: 'plans' }),
  ]);
  return { title: `${plans('title')} — Hearthline`, description: meta('description') };
}

export default async function PricingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { locale } = await params;
  // Carried into the checkout links so an agent can share /pricing?ref=theirs
  // and still be credited — the tag travels in the URL, never in a cookie.
  const { ref } = await searchParams;
  return (
    <>
      <Pricing locale={locale} referralTag={ref ?? null} />
      <ScrollFx />
    </>
  );
}
