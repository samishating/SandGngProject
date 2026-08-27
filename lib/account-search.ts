import { prisma } from '@/lib/prisma';
import { normalizeReference } from '@/lib/order-reference';
import { attributionLabel } from '@/lib/attribution';

/**
 * Finds a customer from whatever an agent has to hand on a phone call: a name,
 * a number, an email, or the order code the customer reads out.
 *
 * There is no Customer table — a customer exists only as the contact details
 * on their orders — so results are Sale rows grouped by email. Email is the
 * grouping key because it's the one field the checkout form requires and
 * validates; names repeat and numbers get typed inconsistently.
 */

export interface AccountOrder {
  id: string;
  reference: string;
  planName: string;
  interval: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: Date;
  periodStart: Date | null;
  periodEnd: Date | null;
  note: string | null;
  salespersonName: string;
  isRecurring: boolean;
}

export interface Account {
  email: string;
  name: string | null;
  phone: string | null;
  orders: AccountOrder[];
  /** The live subscription, if any — the most recently started ACTIVE recurring order. */
  currentSubscription: AccountOrder | null;
  /** Sum of everything actually sold, per currency. Leads and cancellations excluded. */
  paidByCurrency: Array<{ currency: string; total: number }>;
  firstOrderAt: Date;
  lastOrderAt: Date;
}

/** Digits only, so "+1 (555) 000-1111" matches "5550001111". */
function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export async function findAccounts(rawQuery: string, salespersonId?: string): Promise<Account[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const digits = digitsOnly(query);
  const reference = normalizeReference(query);

  const conditions: Array<Record<string, unknown>> = [
    { customerName: { contains: query, mode: 'insensitive' } },
    { customerEmail: { contains: query, mode: 'insensitive' } },
  ];
  // Only treat it as a code when it could be one — otherwise a two-letter name
  // matches half the table on a `contains` against every reference.
  if (reference.length >= 3) conditions.push({ reference: { contains: reference } });
  // Compared against the normalised column so formatting on either side
  // doesn't matter — see the note on Sale.customerPhoneDigits.
  if (digits.length >= 4) conditions.push({ customerPhoneDigits: { contains: digits } });

  // Agents only ever see their own customers; admins pass no id and see
  // everyone. Applied to both queries below, so a missed check can't leak
  // another agent's book.
  const scope = salespersonId ? { salespersonId } : {};

  const hits = await prisma.sale.findMany({
    where: { OR: conditions, ...scope },
    select: { customerEmail: true, id: true },
    take: 200,
  });

  if (hits.length === 0) return [];

  // Widen from the matched orders to every order those customers placed.
  // Searching one order code should still show the whole account — a single
  // row is not "all the data of the client".
  const emails = [...new Set(hits.map(h => h.customerEmail).filter((e): e is string => Boolean(e)))];
  const orphanIds = hits.filter(h => !h.customerEmail).map(h => h.id);

  const matches = await prisma.sale.findMany({
    where: {
      ...scope,
      OR: [
        ...(emails.length ? [{ customerEmail: { in: emails } }] : []),
        ...(orphanIds.length ? [{ id: { in: orphanIds } }] : []),
      ],
    },
    include: { plan: true, salesperson: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const byEmail = new Map<string, typeof matches>();
  for (const sale of matches) {
    // Orders with no email can't be grouped with anything; key them on their
    // own reference so they still surface rather than silently vanishing.
    const key = sale.customerEmail?.toLowerCase() ?? `ref:${sale.reference}`;
    const bucket = byEmail.get(key);
    if (bucket) bucket.push(sale);
    else byEmail.set(key, [sale]);
  }

  const accounts: Account[] = [];
  for (const [key, sales] of byEmail) {
    const orders: AccountOrder[] = sales.map(s => ({
      id: s.id,
      reference: s.reference,
      planName: s.plan.name,
      interval: s.interval,
      status: s.status,
      amount: s.amount,
      currency: s.currency,
      createdAt: s.createdAt,
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
      note: s.note,
      salespersonName: attributionLabel(s.salesperson),
      isRecurring: s.plan.isRecurring,
    }));

    const active = orders
      .filter(o => o.status === 'ACTIVE' && o.isRecurring && o.periodStart)
      .sort((a, b) => (b.periodStart!.getTime() ?? 0) - (a.periodStart!.getTime() ?? 0));

    // Only money that was actually sold counts. A lead still waiting on a
    // callback, or one that was cancelled, has paid nothing.
    const totals = new Map<string, number>();
    for (const o of orders) {
      if (o.status !== 'ACTIVE') continue;
      totals.set(o.currency, (totals.get(o.currency) ?? 0) + o.amount);
    }

    const newest = sales[0]!;
    const times = orders.map(o => o.createdAt.getTime());

    accounts.push({
      email: key.startsWith('ref:') ? '—' : key,
      // The most recent order wins: someone who corrected their name or
      // changed number should show as they are now.
      name: newest.customerName,
      phone: newest.customerPhone,
      orders,
      currentSubscription: active[0] ?? null,
      paidByCurrency: [...totals].map(([currency, total]) => ({ currency, total })),
      firstOrderAt: new Date(Math.min(...times)),
      lastOrderAt: new Date(Math.max(...times)),
    });
  }

  return accounts.sort((a, b) => b.lastOrderAt.getTime() - a.lastOrderAt.getTime());
}
