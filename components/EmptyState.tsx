import Link from "next/link";
import type { ReactNode } from "react";

/**
 * EmptyState — the canonical "this list has nothing in it" surface.
 *
 * Used anywhere a collection can render zero rows (libraries, transaction logs,
 * admin tables, search results, chapter lists…) so an empty list never reads as
 * a broken or still-loading one. Matches the app's dashed-border placeholder
 * idiom: a bordered surface, an optional icon, a display-font title, a muted
 * line of explanation, and an optional call to action.
 *
 * Variants:
 *  - default: padded card with dashed border, for primary content areas.
 *  - inline:  borderless, tighter padding, for nested/secondary spots (e.g. a
 *             single tab inside a panel, or a row slot in a table).
 *
 * Provide an action either declaratively via `actionHref` + `actionLabel`
 * (renders a gold pill / link), or pass arbitrary `children` for custom controls.
 */

type EmptyStateProps = {
  /** Short headline, e.g. "Your library is empty". */
  title: string;
  /** One-line explanation of why it's empty and what to do about it. */
  description?: ReactNode;
  /** Optional leading glyph/icon above the title. */
  icon?: ReactNode;
  /** Declarative CTA target. Pair with `actionLabel`. */
  actionHref?: string;
  /** Declarative CTA label. Pair with `actionHref`. */
  actionLabel?: string;
  /** Render the CTA as a quiet text link instead of a gold pill. */
  subtle?: boolean;
  /** Visual density. */
  variant?: "default" | "inline";
  /** Custom action markup (buttons, multiple links). Overrides actionHref/Label. */
  children?: ReactNode;
  className?: string;
};

export default function EmptyState({
  title,
  description,
  icon,
  actionHref,
  actionLabel,
  subtle = false,
  variant = "default",
  children,
  className = "",
}: EmptyStateProps) {
  const wrapper =
    variant === "inline"
      ? "px-4 py-8 text-center"
      : "border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center";

  return (
    <div className={`${wrapper} ${className}`}>
      {icon && (
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center text-[var(--color-muted)]">
          {icon}
        </div>
      )}

      <p className="font-display text-lg font-semibold text-[var(--color-ink)]">{title}</p>

      {description && (
        <p className="mx-auto mt-1.5 max-w-md text-sm text-[var(--color-muted)]">{description}</p>
      )}

      {children
        ? <div className="mt-5 flex items-center justify-center gap-3">{children}</div>
        : actionHref && actionLabel && (
            subtle ? (
              <Link href={actionHref} className="mt-4 inline-block text-sm text-[var(--color-gold)]">
                {actionLabel} →
              </Link>
            ) : (
              <Link href={actionHref} className="btn-coin mt-5">
                {actionLabel}
              </Link>
            )
          )}
    </div>
  );
}
