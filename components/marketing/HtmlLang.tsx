'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';

/**
 * <html lang> is set by the root layout, which sits above the [locale]
 * segment and so does not re-render on a client-side navigation between
 * locales. Switching language via the nav would otherwise leave the
 * attribute stuck on whichever locale the page was first loaded with,
 * telling screen readers and translation tools the wrong language.
 */
export default function HtmlLang() {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
