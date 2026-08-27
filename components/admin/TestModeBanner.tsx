import { testCheckoutEnabled } from '@/lib/test-checkout';

/**
 * Shown on every admin page while the payment simulator is switched on.
 *
 * The simulator is deliberately reachable in production during the pre-launch
 * testing period, which means the one real risk is nobody remembering to turn
 * it off. An env var is easy to forget; a banner across the top of every admin
 * page is not.
 */
export default function TestModeBanner() {
  if (!testCheckoutEnabled()) return null;

  return (
    <div className="test-mode-banner" role="status">
      <strong>Test payments are on.</strong>{' '}
      <span>
        <code>/checkout/pay</code> accepts the test card and marks orders paid without taking money. Clear{' '}
        <code>NEXT_PUBLIC_TEST_CHECKOUT</code> before the site goes live.
      </span>
    </div>
  );
}
