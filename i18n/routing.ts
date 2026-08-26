import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'fr', 'de', 'es', 'nl'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

/** 'en' -> USD everywhere, every other locale -> EUR. */
export function currencyForLocale(locale: string): 'usd' | 'eur' {
  return locale === 'en' ? 'usd' : 'eur';
}
