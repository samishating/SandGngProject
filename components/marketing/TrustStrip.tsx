import { useTranslations } from 'next-intl';

export default function TrustStrip() {
  const t = useTranslations('trust');

  return (
    <section className="section trust-strip" aria-label="Why Hearthline">
      <div className="container reveal-group grid-4">
        <div className="card elev-sm reveal-item">
          <span className="icon-badge icon-badge-accent">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
              <path d="M2 12h20"></path>
            </svg>
          </span>
          <span className="card-title">{t('officesTitle')}</span>
          <span className="card-body">{t('officesBody')}</span>
        </div>
        <div className="card elev-sm reveal-item">
          <span className="icon-badge icon-badge-accent-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z"></path>
            </svg>
          </span>
          <span className="card-title">{t('unlimitedTitle')}</span>
          <span className="card-body">{t('unlimitedBody')}</span>
        </div>
        <div className="card elev-sm reveal-item">
          <span className="icon-badge icon-badge-accent">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="14" x="2" y="3" rx="2"></rect>
              <path d="M8 21h8"></path>
              <path d="M12 17v4"></path>
            </svg>
          </span>
          <span className="card-title">{t('platformsTitle')}</span>
          <span className="card-body">{t('platformsBody')}</span>
        </div>
        <div className="card elev-sm reveal-item">
          <span className="icon-badge icon-badge-accent-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 6v6l4 2"></path>
              <circle cx="12" cy="12" r="10"></circle>
            </svg>
          </span>
          <span className="card-title">{t('supportTitle')}</span>
          <span className="card-body">{t('supportBody')}</span>
        </div>
      </div>
    </section>
  );
}
