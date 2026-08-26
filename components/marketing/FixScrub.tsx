import { useTranslations } from 'next-intl';

export default function FixScrub() {
  const t = useTranslations('fixScrub');

  return (
    <section className="section fix-scrub" aria-label="What a session looks like">
      <div className="container">
        <span className="kicker reveal-item">{t('kicker')}</span>
        <h2 className="reveal-item">{t('title')}</h2>
      </div>
      <div className="fix-sticky">
        <div className="fix-stage">
          <div className="fix-panel fix-panel-before" id="fixBefore">
            <span className="fix-dot fix-dot-bad" aria-hidden="true"></span>
            <div className="fix-titlebar">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className="fix-row fix-row-bad">
              <span className="fix-row-icon">!</span>
              {t('beforeRow1')}
            </div>
            <div className="fix-row fix-row-bad">
              <span className="fix-row-icon">!</span>
              {t('beforeRow2')}
            </div>
            <div className="fix-row fix-row-bad">
              <span className="fix-row-icon">!</span>
              {t('beforeRow3')}
            </div>
            <div className="fix-row fix-row-bad">
              <span className="fix-row-icon">!</span>
              {t('beforeRow4')}
            </div>
            <span className="fix-badge fix-badge-bad">{t('beforeBadge')}</span>
          </div>
          <div className="fix-panel fix-panel-after" id="fixAfter">
            <span className="fix-dot fix-dot-good" aria-hidden="true"></span>
            <div className="fix-titlebar">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className="fix-row fix-row-good">
              <span className="fix-row-icon">✓</span>
              {t('afterRow1')}
            </div>
            <div className="fix-row fix-row-good">
              <span className="fix-row-icon">✓</span>
              {t('afterRow2')}
            </div>
            <div className="fix-row fix-row-good">
              <span className="fix-row-icon">✓</span>
              {t('afterRow3')}
            </div>
            <div className="fix-row fix-row-good">
              <span className="fix-row-icon">✓</span>
              {t('afterRow4')}
            </div>
            <span className="fix-badge fix-badge-good">{t('afterBadge')}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
