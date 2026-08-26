import type { ReactNode } from 'react';
import { getLocale } from 'next-intl/server';
import '@/styles/design-system.css';
import '@/styles/globals.css';

// The true Next.js root layout — every request passes through this,
// including the unlocalized /admin, /dashboard and /login routes, so it's
// the one place <html>/<body> can live. getLocale() resolves to the
// current marketing-site locale when there is one, and falls back to the
// default otherwise (admin/dashboard/login aren't translated).
export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
