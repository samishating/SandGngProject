import { useTranslations } from 'next-intl';

export default function HowItWorks() {
  const t = useTranslations('how');

  return (
    <section className="section" id="how" aria-label="How it works">
      <div className="container">
        <span className="kicker reveal-item">{t('kicker')}</span>
        <h2 className="reveal-item">{t('title')}</h2>
        <div className="reveal-group grid-steps">
          <div className="step">
            <span className="step-num">01</span>
            <h3>{t('step1Title')}</h3>
            <p>{t('step1Body')}</p>
          </div>
          <div className="step">
            <span className="step-num">02</span>
            <h3>{t('step2Title')}</h3>
            <p>{t('step2Body')}</p>
          </div>
          <div className="step">
            <span className="step-num">03</span>
            <h3>{t('step3Title')}</h3>
            <p>{t('step3Body')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
