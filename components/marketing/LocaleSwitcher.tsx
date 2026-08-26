'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

/**
 * Flags are inline SVG rather than emoji: Windows has no flag glyphs for
 * regional-indicator pairs, so 🇫🇷 renders there as a bare "FR" — on a
 * switcher whose whole point is the flag. Simplified shapes, sized to stay
 * legible at 20x14. `en` uses the US flag to match currencyForLocale(),
 * which maps `en` to USD.
 */
const FLAGS: Record<string, React.ReactNode> = {
  en: (
    <>
      <rect width="20" height="14" fill="#b22234" />
      <rect y="2" width="20" height="2" fill="#fff" />
      <rect y="6" width="20" height="2" fill="#fff" />
      <rect y="10" width="20" height="2" fill="#fff" />
      <rect width="9" height="8" fill="#3c3b6e" />
    </>
  ),
  fr: (
    <>
      <rect width="20" height="14" fill="#fff" />
      <rect width="6.67" height="14" fill="#002395" />
      <rect x="13.33" width="6.67" height="14" fill="#ed2939" />
    </>
  ),
  de: (
    <>
      <rect width="20" height="14" fill="#000" />
      <rect y="4.67" width="20" height="4.67" fill="#dd0000" />
      <rect y="9.33" width="20" height="4.67" fill="#ffce00" />
    </>
  ),
  es: (
    <>
      <rect width="20" height="14" fill="#aa151b" />
      <rect y="3.5" width="20" height="7" fill="#f1bf00" />
    </>
  ),
  nl: (
    <>
      <rect width="20" height="14" fill="#fff" />
      <rect width="20" height="4.67" fill="#ae1c28" />
      <rect y="9.33" width="20" height="4.67" fill="#21468b" />
    </>
  ),
};

// Native names, not translated — a language switcher lists each language in
// its own language, so a visitor who can't read the current one still finds
// theirs. Saves 25 message keys that would all hold the same 5 strings.
const NAMES: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  nl: 'Nederlands',
};

function Flag({ locale }: { locale: string }) {
  return (
    <span className="flag" aria-hidden="true">
      <svg viewBox="0 0 20 14" width="20" height="14">
        {FLAGS[locale]}
      </svg>
    </span>
  );
}

export default function LocaleSwitcher({
  variant = 'dropdown',
  onNavigate,
}: {
  variant?: 'dropdown' | 'inline';
  onNavigate?: () => void;
}) {
  const t = useTranslations('nav');
  const active = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  function select(locale: string) {
    setOpen(false);
    onNavigate?.();
    if (locale === active) return;
    // pathname here is already locale-stripped by next-intl's navigation
    // helpers, so this re-renders the same page under the new prefix.
    startTransition(() => router.replace(pathname, { locale }));
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (variant === 'inline') {
    return (
      <div className="locale-inline" role="group" aria-label={t('language')}>
        {routing.locales.map(locale => (
          <button
            key={locale}
            type="button"
            className={`locale-inline-opt${locale === active ? ' is-active' : ''}`}
            aria-current={locale === active}
            onClick={() => select(locale)}
          >
            <Flag locale={locale} />
            {NAMES[locale]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`locale-switcher${pending ? ' is-pending' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="locale-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('language')}: ${NAMES[active]}`}
        onClick={() => setOpen(o => !o)}
      >
        <Flag locale={active} />
        <span className="locale-code">{active.toUpperCase()}</span>
        <svg className="locale-caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul className="locale-menu" role="listbox" aria-label={t('language')}>
          {routing.locales.map(locale => (
            <li key={locale} role="none">
              <button
                type="button"
                role="option"
                aria-selected={locale === active}
                className={`locale-opt${locale === active ? ' is-active' : ''}`}
                onClick={() => select(locale)}
              >
                <Flag locale={locale} />
                {NAMES[locale]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
