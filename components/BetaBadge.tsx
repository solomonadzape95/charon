/**
 * "testnet beta" label shown under the Charon wordmark in every header.
 *
 * It is full-width and justified so it stretches to exactly the width of the
 * "Charon" text above it, lining up on both edges. Charon currently runs on Arc
 * testnet with test USDC, so this sets that expectation before anyone deposits.
 */
export function BetaBadge({ className = "" }: { className?: string }) {
  return (
    <span
      data-tour="beta"
      title="Charon runs on Arc testnet. Balances are test USDC, not real money."
      className={`block w-full text-right text-[0.58rem] font-semibold uppercase text-[var(--color-gold)] [text-align-last:left] ${className}`}
    >
      testnet beta
    </span>
  );
}
