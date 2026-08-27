/**
 * How an order is labelled when no salesperson is attached to it.
 *
 * An order with no referral isn't missing data — the customer found the site
 * and ordered on their own, and nobody is owed commission for it. A dash reads
 * as "unknown"; this says what actually happened.
 */
export const SELF_SERVE_LABEL = 'Self serve';

export function attributionLabel(salesperson: { displayName: string | null; email: string } | null | undefined): string {
  if (!salesperson) return SELF_SERVE_LABEL;
  return salesperson.displayName ?? salesperson.email;
}
