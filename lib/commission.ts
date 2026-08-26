import type { CommissionRule } from '@prisma/client';
import { prisma } from './prisma';

interface ResolveArgs {
  salespersonId: string;
  planId: string;
  currency: string;
}

function activeWindow(now: Date) {
  return {
    isActive: true,
    effectiveFrom: { lte: now },
    OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
  };
}

// PERCENTAGE rules apply regardless of currency; FLAT rules only apply if
// they were configured for this exact currency (a flat fee has to be set
// per-currency — there's no sane conversion to fall back to).
function currencyCompatible(currency: string) {
  return { OR: [{ type: 'PERCENTAGE' as const }, { type: 'FLAT' as const, currency }] };
}

/**
 * Resolves the commission rule that applies right now for a given sale.
 * Plan-specific rules win over the salesperson's default. Returns null if
 * nothing matches — callers should record a $0 commission event flagged as
 * "no rule configured" rather than guessing.
 */
export async function resolveCommissionRule({ salespersonId, planId, currency }: ResolveArgs): Promise<CommissionRule | null> {
  const now = new Date();

  const planSpecific = await prisma.commissionRule.findFirst({
    where: { AND: [{ salespersonId, scope: 'PLAN_SPECIFIC', planId }, activeWindow(now), currencyCompatible(currency)] },
    orderBy: { effectiveFrom: 'desc' },
  });
  if (planSpecific) return planSpecific;

  return prisma.commissionRule.findFirst({
    where: { AND: [{ salespersonId, scope: 'SALESPERSON_DEFAULT' }, activeWindow(now), currencyCompatible(currency)] },
    orderBy: { effectiveFrom: 'desc' },
  });
}

/** grossAmount is in cents. Returns the commission in cents, rounded. */
export function calculateCommissionAmount(rule: Pick<CommissionRule, 'type' | 'value'>, grossAmount: number): number {
  if (rule.type === 'FLAT') {
    // value is stored as cents for FLAT rules.
    return Math.round(rule.value.toNumber());
  }
  // PERCENTAGE: value is stored like 10.0000 meaning 10%.
  return Math.round((grossAmount * rule.value.toNumber()) / 100);
}
