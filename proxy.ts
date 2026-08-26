import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';
import { REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE } from './lib/referral-constants';

const intlMiddleware = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin and /dashboard are unlinked, auth-gated, and NOT locale-prefixed
  // — they skip next-intl entirely. Only a session check happens here;
  // the actual role check (admin vs salesperson) happens in each section's
  // layout.tsx, which can use Prisma.
  if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
    const { response, user } = await updateSession(request);
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // /login and /auth/callback live outside app/[locale]/, so they must skip
  // next-intl too — otherwise the locale middleware rewrites them to
  // /en/login and /en/auth/callback, which have no matching route and 404.
  // That breaks both signing in and the magic-link callback itself.
  if (pathname === '/login' || pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }

  const response = intlMiddleware(request);

  // Referral attribution: ?ref=<tag> anywhere on the marketing site tags
  // the visitor for REFERRAL_COOKIE_MAX_AGE. Not validated against the DB
  // here — see lib/referral.ts, checked once at checkout time.
  const ref = request.nextUrl.searchParams.get('ref');
  if (ref) {
    response.cookies.set(REFERRAL_COOKIE, ref, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: REFERRAL_COOKIE_MAX_AGE,
      path: '/',
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
