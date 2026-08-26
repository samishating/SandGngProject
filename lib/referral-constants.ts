// Split out from referral.ts because that file imports Prisma, which can't
// run on the Edge runtime — middleware.ts (Edge) only needs these constants,
// never the Prisma-backed resolveReferral() lookup.
export const REFERRAL_COOKIE = 'hl_ref';
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
