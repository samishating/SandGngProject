import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function Hero() {
  const t = useTranslations('hero');

  return (
    <section className="hero-scrub" id="top" aria-label="Introduction">
      <div className="hero-sticky">
        <div className="hero-media">
          <video id="heroVideo" className="hero-video" muted playsInline preload="auto" poster="/assets/hf-study.webp">
            <source src="/assets/hero.mp4" type="video/mp4" />
          </video>
          {/* eslint-disable-next-line @next/next/no-img-element -- parallax code sets el.style.transform directly; next/image's wrapper risks fighting it */}
          <img id="heroFallback" className="hero-video hero-fallback" src="/assets/hf-study.webp" alt="" hidden />
          <span className="hero-scrim" aria-hidden="true"></span>
        </div>

        <span className="hero-orb hero-orb-a" aria-hidden="true"></span>
        <span className="hero-orb hero-orb-b" aria-hidden="true"></span>

        <div className="hero-chips" aria-hidden="true">
          <span className="hero-chip hero-chip-a">
            <span className="hero-chip-check">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"></path>
              </svg>
            </span>
            {t('chipDiagnostic')}
          </span>
          <span className="hero-chip hero-chip-b">
            <span className="hero-chip-check">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"></path>
              </svg>
            </span>
            {t('chipMalware')}
          </span>
          <span className="hero-chip hero-chip-c">
            <span className="hero-chip-check">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"></path>
              </svg>
            </span>
            {t('chipPrinter')}
          </span>
        </div>

        <div className="hero-copy" id="heroCopy">
          <span className="eyebrow">
            <span className="eyebrow-dot" aria-hidden="true"></span>
            {t('eyebrow')}
          </span>
          <h1>
            <span className="line">{t('titleLine1')}</span>
            <span className="line">{t('titleLine2')}</span>
          </h1>
          <p className="lead">{t('lead')}</p>
          <div className="hero-actions">
            <Link className="btn btn-primary btn-lg" href="/pricing">
              {t('ctaPrimary')}
            </Link>
            <a className="btn btn-secondary btn-lg" href={`tel:${t('phone').replace(/[^0-9+]/g, '')}`}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"></path>
              </svg>
              {t('phone')}
            </a>
          </div>
        </div>

        {/* Crossfades in as hero-copy fades out (driven by ScrollFx), so the
            hero doesn't sit empty for the rest of the pinned scroll. */}
        <div className="hero-trust" id="heroTrust" aria-hidden="true">
          <div className="hero-trust-inner">
            <span className="hero-trust-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"></path>
              </svg>
            </span>
            <span className="hero-trust-text">{t('trustBadge')}</span>
          </div>
        </div>

        <span className="hero-scroll-cue" aria-hidden="true">
          {t('scroll')}
          <span className="hero-scroll-line"></span>
        </span>
      </div>
    </section>
  );
}
