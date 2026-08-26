import { useTranslations } from 'next-intl';

export default function About() {
  const t = useTranslations('about');

  return (
    <section className="section" id="about" aria-label="About Hearthline">
      <div className="container grid-about">
        <div className="reveal-group">
          <span className="kicker reveal-item">{t('kicker')}</span>
          <h2 className="reveal-item">{t('title')}</h2>
          <p className="reveal-item">{t('body1')}</p>
          <p className="reveal-item">{t('body2')}</p>
          <div className="tag-row reveal-item">
            <span className="tag tag-accent">{t('tagSince')}</span>
            <span className="tag tag-accent-2">{t('tagTeam')}</span>
            <span className="tag tag-neutral">{t('tagLanguages')}</span>
            <span className="tag tag-outline">{t('tagHours')}</span>
          </div>
        </div>
        <div className="about-media">
          <div className="parallax-bg" data-parallax="0.22">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/hf-livingroom.webp" alt={t('imageAlt')} loading="lazy" />
          </div>
        </div>
      </div>
    </section>
  );
}
