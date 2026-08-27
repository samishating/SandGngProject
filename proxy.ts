import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';

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
  if (pathname === '/login' || pathname.startsWith('/login/') || pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }

  // Referral attribution deliberately does NOT happen here any more.
  //
  // A ?ref= used to be stored in a 30-day cookie, which meant one visit to an
  // agent's link credited them with every order that browser placed for a
  // month — including ones the customer clearly made on their own. Each order
  // is now credited only to the link that produced it: the ref travels in the
  // URL to checkout and is read there. See lib/referral.ts.
  //
  // The upshot is that an order with no ref on it counts for nobody, which is
  // what "self serve" is supposed to mean.
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
