"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = {
  reader: [
    { href: "/dashboard", label: "Overview" },
    { href: "/library", label: "Library" },
    { href: "/wallet", label: "Wallet" },
    { href: "/read", label: "Browse" },
  ],
  creator: [
    { href: "/creator", label: "Studio" },
    { href: "/creator/dashboard", label: "Earnings" },
    { href: "/creator/analytics", label: "Analytics" },
    { href: "/creator/audience", label: "Audience" },
  ],
};

export function SubNav({ role }: { role: "reader" | "creator" }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto max-w-6xl px-6 pt-8">
      <nav className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)]">
        {TABS[role].map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-utility transition-colors ${
                active
                  ? "border-[var(--color-gold)] text-[var(--color-ink)]"
                  : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
