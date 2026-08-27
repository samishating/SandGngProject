import { prisma } from './prisma';

/**
 * Resolves a referral tag to the salesperson who owns it.
 *
 * The tag comes from the ?ref= on the checkout the customer actually used, not
 * from a stored cookie. That's the whole model: an order is credited to the
 * link that produced it, and an order placed without one counts for nobody.
 *
 * A previous version parked the tag in a 30-day cookie, which meant a single
 * visit to an agent's link credited them with every order that browser made
 * for a month — including plainly self-serve ones. Per-order attribution is
 * both easier to reason about and harder to argue with at payout time.
 *
 * Validated here rather than wherever the tag was picked up, so an inactive or
 * unknown tag resolves to nobody instead of to a stale name.
 */
export async function resolveReferral(tag: string | null | undefined): Promise<{ referralTagId: string; salespersonId: string } | null> {
  const trimmed = tag?.trim();
  if (!trimmed) return null;

  const referralTag = await prisma.referralTag.findFirst({
    where: { tag: { equals: trimmed, mode: 'insensitive' }, isActive: true },
    select: { id: true, salespersonId: true },
  });
  if (!referralTag) return null;

  return { referralTagId: referralTag.id, salespersonId: referralTag.salespersonId };
}
