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

export default function PricingPage() {
  return (
    <>
      <Pricing />
      <ScrollFx />
    </>
  );
}
