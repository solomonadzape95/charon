"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

const btn =
  "inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-muted)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-ink)] disabled:cursor-default disabled:opacity-40 disabled:hover:border-[var(--color-border)] disabled:hover:text-[var(--color-muted)]";

/** Compact prev/next pager for the admin list pages. Hidden when there's nothing to page. */
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (total <= pageSize) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex items-center justify-between gap-3 text-utility text-[var(--color-muted)]">
      <span className="tabular">
        {from.toLocaleString()} to {to.toLocaleString()} of {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className={btn} aria-label="Previous page">
          <ChevronLeft size={15} />
        </button>
        <span className="tabular px-1">
          {page} / {pages}
        </span>
        <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pages} className={btn} aria-label="Next page">
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
