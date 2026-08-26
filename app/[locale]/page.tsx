import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Hero from '@/components/marketing/Hero';
import ScrollFx from '@/components/marketing/ScrollFx';
import Ticker from '@/components/marketing/Ticker';
import TrustStrip from '@/components/marketing/TrustStrip';
import Services from '@/components/marketing/Services';
import FixScrub from '@/components/marketing/FixScrub';
import Testimonial from '@/components/marketing/Testimonial';
import HowItWorks from '@/components/marketing/HowItWorks';
import About from '@/components/marketing/About';
import CtaForm from '@/components/marketing/CtaForm';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('title'), description: t('description') };
}

export default async function MarketingPage() {
  const t = await getTranslations('cta');

  return (
    <>
      <Hero />
      <Ticker />
      <TrustStrip />
      <Services />
      <FixScrub />
      <Testimonial />
      <HowItWorks />
      <About />

      {/* id is the target the pricing CTAs link to now that there is no
          online checkout — every plan button lands here. */}
      <section className="section cta-section" id="callback" aria-label="Request a call back">
        <div className="container">
          <span className="cta-orb cta-orb-a" aria-hidden="true"></span>
          <span className="cta-orb cta-orb-b" aria-hidden="true"></span>
          <div className="cta-panel reveal-item">
            <h2>{t('title')}</h2>
            <p>{t('body')}</p>
            <CtaForm />
          </div>
        </div>
      </section>

      <ScrollFx />
    </>
  );
}
