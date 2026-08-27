import { getTranslations } from 'next-intl/server';
import { getPricing } from '@/lib/pricing';
import PricingCards from './PricingCards';

/**
 * Server half of the pricing section: resolves the visitor's currency and
 * loads the admin-set USD prices, converting them before anything renders.
 * The interval toggle lives in PricingCards, which is the client half.
 */
export default async function Pricing({ locale, referralTag = null }: { locale: string; referralTag?: string | null }) {
  const t = await getTranslations('plans');
  const pricing = await getPricing(locale);

  return (
    <section className="section" id="plans" aria-label="Plans and pricing">
      <div className="container">
        <span className="kicker reveal-item">{t('kicker')}</span>
        <h2 className="reveal-item">{t('title')}</h2>
        <p className="section-lead reveal-item">{t('subtitle')}</p>

        <PricingCards pricing={pricing} referralTag={referralTag} />
      </div>
    </section>
  );
}
