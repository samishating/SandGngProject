/**
 * Simulated payment step, for exercising the order → payment → commission
 * chain without a payment processor.
 *
 * Off unless NEXT_PUBLIC_TEST_CHECKOUT is exactly "1". The flag is checked on
 * the server before the page renders AND before the API will act, so leaving
 * it unset in production means the route 404s rather than merely hiding a
 * link. That matters more than usual here: a page that asks for a card number
 * and always says yes must not be reachable by a real customer, who could
 * type a real card into something that neither takes payment nor is built to
 * hold card data.
 *
 * The form never transmits or stores a card number — see TestPaymentForm.
 */
export function testCheckoutEnabled(): boolean {
  return process.env.NEXT_PUBLIC_TEST_CHECKOUT === '1';
}

/**
 * The only number the simulator accepts. Anything else is refused, so a real
 * card typed in by mistake is rejected rather than quietly "working".
 * Deliberately the industry-standard test PAN, which no bank will ever issue.
 */
export const TEST_CARD_NUMBER = '4242 4242 4242 4242';

export function isTestCard(input: string): boolean {
  return input.replace(/\D/g, '') === TEST_CARD_NUMBER.replace(/\D/g, '');
}
