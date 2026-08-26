import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { REFERRAL_COOKIE } from './referral-constants';

export { REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE } from './referral-constants';

/**
 * Reads the referral cookie set by middleware.ts and resolves it to an
 * active tag + the salesperson it belongs to. Validated here (checkout
 * time, Node runtime), not in middleware, to avoid a DB round-trip on every
 * page view and to keep Prisma out of the Edge bundle.
 */
export async function resolveReferral(): Promise<{ referralTagId: string; salespersonId: string } | null> {
  const cookieStore = await cookies();
  const tag = cookieStore.get(REFERRAL_COOKIE)?.value;
  if (!tag) return null;

  const referralTag = await prisma.referralTag.findFirst({
    where: { tag: { equals: tag, mode: 'insensitive' }, isActive: true },
    select: { id: true, salespersonId: true },
  });
  if (!referralTag) return null;

  return { referralTagId: referralTag.id, salespersonId: referralTag.salespersonId };
}
