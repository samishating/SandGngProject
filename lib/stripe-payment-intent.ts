import { stripe } from './stripe';

/**
 * Resolves the PaymentIntent behind a given invoice via the InvoicePayments
 * API — modern Stripe API versions dropped the direct Invoice.payment_intent
 * field, so this is the documented way to trace an invoice to its payment.
 */
export async function paymentIntentForInvoice(invoiceId: string): Promise<string | null> {
  const payments = await stripe.invoicePayments.list({ invoice: invoiceId, limit: 1 });
  const payment = payments.data[0];
  if (!payment) return null;
  const pi = payment.payment.payment_intent;
  return typeof pi === 'string' ? pi : (pi?.id ?? null);
}
