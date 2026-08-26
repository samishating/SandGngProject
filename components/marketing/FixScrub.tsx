import { useTranslations } from 'next-intl';

const ICONS = [
  // storage — stacked platters
  <>
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
    <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
  </>,
  // speed — gauge
  <>
    <path d="M3.5 18a9 9 0 1 1 17 0" />
    <path d="m12 14 4.5-4.5" />
    <circle cx="12" cy="14" r="1.4" />
  </>,
  // security — shield with check
  <>
    <path d="M12 2.8 4.5 6v5.5c0 4.6 3.2 8.5 7.5 9.7 4.3-1.2 7.5-5.1 7.5-9.7V6z" />
    <path d="m9 12 2.2 2.2L15.4 10" />
  </>,
  // browser — window with a removed tab
  <>
    <rect x="2.6" y="4.5" width="18.8" height="15" rx="2.6" />
    <path d="M2.6 9.2h18.8" />
    <path d="M6 6.9h.01M9 6.9h.01" />
    <path d="m10.4 13.4 3.6 3.6M14 13.4l-3.6 3.6" />
  </>,
];

export default function FixScrub() {
  const t = useTranslations('fixScrub');

  const steps = [1, 2, 3, 4].map(n => ({
    label: t(`step${n}Label`),
    metric: t(`step${n}Metric`),
    metricLabel: t(`step${n}MetricLabel`),
    note: t(`step${n}Note`),
    before: t(`beforeRow${n}`),
    after: t(`afterRow${n}`),
    icon: ICONS[n - 1],
  }));

  return (
    <section className="section fix-scrub" aria-label="What a session looks like">
      <div className="container">
        <span className="kicker reveal-item">{t('kicker')}</span>
        <h2 className="reveal-item">{t('title')}</h2>
      </div>
      <div className="fix-sticky">
        <div className="fix-stage">
          <div className="fix-track" id="fixTrack">
            <article className="fix-card fix-card-bookend">
              <div className="fix-titlebar">
                <span></span>
                <span></span>
                <span></span>
                <span className="fix-dot fix-dot-bad" aria-hidden="true"></span>
              </div>
              <h3 className="fix-bookend-title">{t('beforeTitle')}</h3>
              {steps.map((s, i) => (
                <div className="fix-row fix-row-bad" key={i}>
                  <span className="fix-row-icon" aria-hidden="true">!</span>
                  {s.before}
                </div>
              ))}
              <span className="fix-badge fix-badge-bad">{t('beforeBadge')}</span>
            </article>

            {steps.map((s, i) => (
              <article className="fix-card fix-card-spot" key={i}>
                <div className="fix-spot-head">
                  <span className="fix-spot-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      {s.icon}
                    </svg>
                  </span>
                  <span className="fix-spot-label">{s.label}</span>
                  <span className="fix-spot-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                </div>

                <p className="fix-metric">
                  <span className="fix-metric-num">{s.metric}</span>
                  <span className="fix-metric-label">{s.metricLabel}</span>
                </p>

                <div className="fix-row fix-row-bad">
                  <span className="fix-row-icon" aria-hidden="true">!</span>
                  {s.before}
                </div>
                <span className="fix-spot-arrow" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14"></path>
                    <path d="m19 12-7 7-7-7"></path>
                  </svg>
                </span>
                <div className="fix-row fix-row-good">
                  <span className="fix-row-icon" aria-hidden="true">✓</span>
                  {s.after}
                </div>

                <p className="fix-note">{s.note}</p>
              </article>
            ))}

            <article className="fix-card fix-card-bookend">
              <div className="fix-titlebar">
                <span></span>
                <span></span>
                <span></span>
                <span className="fix-dot fix-dot-good" aria-hidden="true"></span>
              </div>
              <h3 className="fix-bookend-title">{t('afterTitle')}</h3>
              {steps.map((s, i) => (
                <div className="fix-row fix-row-good" key={i}>
                  <span className="fix-row-icon" aria-hidden="true">✓</span>
                  {s.after}
                </div>
              ))}
              <span className="fix-badge fix-badge-good">{t('afterBadge')}</span>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
