/**
 * "testnet beta" pill shown beside the Charon wordmark in every header.
 *
 * Charon currently settles on **Arc testnet** with test USDC — no real money
 * moves. This badge sets that expectation up front so readers and creators know
 * the platform is pre-production before they deposit or publish.
 */
export function BetaBadge({ className = "" }: { className?: string }) {
  return (
    <span
      data-tour="beta"
      title="Charon runs on Arc testnet — balances are test USDC, not real money."
      className={`inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--color-gold)_55%,transparent)] px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-[var(--color-gold)] ${className}`}
    >
      testnet&nbsp;beta
    </span>
  );
}
