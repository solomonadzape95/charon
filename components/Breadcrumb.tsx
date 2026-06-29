import { Fragment } from "react";
import Link from "next/link";

/** Editorial breadcrumb trail — replaces ad-hoc "← Back" links across the app. */
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-utility flex flex-wrap items-center gap-2 text-[var(--color-muted)]">
      {items.map((it, i) => (
        <Fragment key={i}>
          {i > 0 && <span aria-hidden>/</span>}
          {it.href ? (
            <Link href={it.href} className="transition-colors hover:text-[var(--color-ink)]">
              {it.label}
            </Link>
          ) : (
            <span className="text-[var(--color-ink)]">{it.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
