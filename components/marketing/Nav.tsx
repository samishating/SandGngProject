'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function Nav() {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);

  return (
    <header className={`site-nav${open ? ' is-open' : ''}`} id="siteNav">
      <div className="nav-inner">
        <Link className="brand" href="/" aria-label="Hearthline home">
          <span className="nav-mark" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-bg)" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path>
              <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            </svg>
          </span>
          {t('brand')}
        </Link>
        <nav className="nav-links" aria-label="Primary">
          <Link href="/#services">{t('services')}</Link>
          <Link href="/#how">{t('how')}</Link>
          <Link href="/#about">{t('about')}</Link>
          <Link href="/pricing">{t('plans')}</Link>
        </nav>
        <Link className="btn btn-primary nav-cta" href="/pricing">
          {t('freeDiagnostic')}
        </Link>
        <button
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="navSheet"
          aria-label={t('openMenu')}
          onClick={() => setOpen(o => !o)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
      <div className="nav-sheet" id="navSheet">
        <Link href="/#services" onClick={() => setOpen(false)}>
          {t('services')}
        </Link>
        <Link href="/#how" onClick={() => setOpen(false)}>
          {t('how')}
        </Link>
        <Link href="/#about" onClick={() => setOpen(false)}>
          {t('about')}
        </Link>
        <Link href="/pricing" onClick={() => setOpen(false)}>
          {t('plans')}
        </Link>
        <Link className="btn btn-primary btn-block" href="/pricing" onClick={() => setOpen(false)}>
          {t('freeDiagnostic')}
        </Link>
      </div>
    </header>
  );
}
