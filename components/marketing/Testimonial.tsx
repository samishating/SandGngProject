import { useTranslations } from 'next-intl';

export default function Testimonial() {
  const t = useTranslations('testimonial');

  return (
    <section className="section quote-section" aria-label="Customer story">
      <div className="parallax-bg" data-parallax="0.35">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/hf-tech.webp" alt={t('imageAlt')} loading="lazy" />
      </div>
      <span className="quote-scrim" aria-hidden="true"></span>
      <figure className="quote-figure reveal-item">
        <blockquote>&ldquo;{t('quote')}&rdquo;</blockquote>
        <figcaption>{t('caption')}</figcaption>
      </figure>
    </section>
  );
}
