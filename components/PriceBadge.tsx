/**
 * Small price indicator shown on every chapter — current price + what's driving it.
 * Transparent, never surprising. (Reason label is enriched by Agent 3 in later phases.)
 */
export function PriceBadge({
  price,
  label,
  className = "",
}: {
  price: number;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-medium ${className}`}
    >
      <span className="text-[var(--color-gold)]">${price.toFixed(2)}</span>
      {label && label !== "standard" && (
        <span className="text-[var(--color-muted)]">· {label}</span>
      )}
    </span>
  );
}
