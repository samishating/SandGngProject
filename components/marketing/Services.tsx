import { useTranslations } from 'next-intl';

const services = [
  {
    titleKey: 'cleanupTitle',
    bodyKey: 'cleanupBody',
    badge: 'accent',
    icon: (
      <>
        <path d="M3 6h18"></path>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        <line x1="10" x2="10" y1="11" y2="17"></line>
        <line x1="14" x2="14" y1="11" y2="17"></line>
      </>
    ),
  },
  {
    titleKey: 'protectionTitle',
    bodyKey: 'protectionBody',
    badge: 'accent-2',
    icon: (
      <>
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
        <path d="m9 12 2 2 4-4"></path>
      </>
    ),
  },
  {
    titleKey: 'tuneupTitle',
    bodyKey: 'tuneupBody',
    badge: 'accent',
    icon: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>,
  },
  {
    titleKey: 'networkTitle',
    bodyKey: 'networkBody',
    badge: 'accent-2',
    icon: (
      <>
        <path d="M12 20h.01"></path>
        <path d="M2 8.82a15 15 0 0 1 20 0"></path>
        <path d="M5 12.859a10 10 0 0 1 14 0"></path>
        <path d="M8.5 16.429a5 5 0 0 1 7 0"></path>
      </>
    ),
  },
  {
    titleKey: 'virusTitle',
    bodyKey: 'virusBody',
    badge: 'accent',
    icon: (
      <>
        <path d="m8 2 1.88 1.88"></path>
        <path d="M14.12 3.88 16 2"></path>
        <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"></path>
        <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"></path>
        <path d="M12 20v-9"></path>
        <path d="M6.53 9C4.6 8.8 3 7.1 3 5"></path>
        <path d="M6 13H2"></path>
        <path d="M3 21c0-2.1 1.7-3.9 3.8-4"></path>
        <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"></path>
        <path d="M22 13h-4"></path>
        <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"></path>
      </>
    ),
  },
  {
    titleKey: 'accessoriesTitle',
    bodyKey: 'accessoriesBody',
    badge: 'accent-2',
    icon: (
      <>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
        <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"></path>
        <rect x="6" y="14" width="12" height="8" rx="1"></rect>
      </>
    ),
  },
  {
    titleKey: 'crashesTitle',
    bodyKey: 'crashesBody',
    badge: 'accent',
    icon: (
      <>
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path>
        <path d="M12 9v4"></path>
        <path d="M12 17h.01"></path>
      </>
    ),
  },
  {
    titleKey: 'backupTitle',
    bodyKey: 'backupBody',
    badge: 'accent-2',
    icon: (
      <>
        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
        <path d="M3 5V19A9 3 0 0 0 21 19V5"></path>
        <path d="M3 12A9 3 0 0 0 21 12"></path>
      </>
    ),
  },
  {
    titleKey: 'gamingTitle',
    bodyKey: 'gamingBody',
    badge: 'accent',
    icon: (
      <>
        <line x1="6" x2="10" y1="11" y2="11"></line>
        <line x1="8" x2="8" y1="9" y2="13"></line>
        <line x1="15" x2="15.01" y1="12" y2="12"></line>
        <line x1="18" x2="18.01" y1="10" y2="10"></line>
        <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"></path>
      </>
    ),
  },
  {
    titleKey: 'softwareTitle',
    bodyKey: 'softwareBody',
    badge: 'accent-2',
    icon: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" x2="12" y1="15" y2="3"></line>
      </>
    ),
  },
] as const;

export default function Services() {
  const t = useTranslations('services');

  return (
    <section className="section" id="services" aria-label="Services">
      <div className="container">
        <span className="kicker reveal-item">{t('kicker')}</span>
        <h2 className="reveal-item">{t('title')}</h2>
        <p className="section-lead reveal-item">{t('lead')}</p>

        <div className="reveal-group grid-services">
          {services.map(s => (
            <div className="card elev-sm reveal-item" key={s.titleKey}>
              <span className={`icon-badge icon-badge-${s.badge}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
                  {s.icon}
                </svg>
              </span>
              <span className="card-title service-title">{t(s.titleKey)}</span>
              <span className="card-body">{t(s.bodyKey)}</span>
            </div>
          ))}
        </div>

        <div className="device-strip reveal-item">
          <div className="device-strip-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/hf-devices.webp" alt={t('deviceStripAlt')} loading="lazy" />
          </div>
          <div className="device-strip-copy">
            <span className="card-title">{t('deviceStripTitle')}</span>
            <span className="card-body">{t('deviceStripBody')}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
