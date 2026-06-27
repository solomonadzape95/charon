import Link from "next/link";
import { Logo } from "@/components/Logo";

const COLS = [
  {
    head: "Read",
    links: [
      { label: "Browse", href: "/read" },
      { label: "Your wallet", href: "/dashboard" },
      { label: "Live stats", href: "/stats" },
    ],
  },
  {
    head: "Create",
    links: [
      { label: "Publish", href: "/creator" },
      { label: "Earnings", href: "/creator/dashboard" },
      { label: "Join", href: "/creator/join" },
    ],
  },
  {
    head: "Built on",
    links: [
      { label: "Arc", href: "https://testnet.arcscan.app" },
      { label: "Circle", href: "https://circle.com" },
      { label: "x402", href: "https://x402.org" },
    ],
  },
];

export function BigFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)]">
      {/* Top row — short statement + link columns */}
      <div className="mx-auto grid max-w-[88rem] grid-cols-2 gap-y-10 px-6 pb-16 pt-14 md:grid-cols-5 lg:px-10">
        <div className="col-span-2">
          <p className="max-w-xs text-xl leading-snug">
            Read freely. Pay for what it&apos;s worth. Creators earn every chapter.
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.head} className="flex flex-col gap-3">
            <span className="text-utility text-[var(--color-muted)]">{c.head}</span>
            {c.links.map((l) => (
              <Link key={l.label} href={l.href} className="w-fit text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]">
                {l.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* Massive wordmark — the "O" is the coin */}
      <div className="overflow-hidden px-6 lg:px-10">
        <div
          className="font-display flex items-center justify-center font-bold leading-[0.8] tracking-tight text-coin"
          style={{ fontSize: "clamp(4.5rem, 20vw, 18rem)" }}
        >
          <span>CHAR</span>
          <Logo className="mx-[0.02em] inline-block text-[var(--color-gold)]" />
          <span>N</span>
        </div>
      </div>

      <div className="mx-auto flex max-w-[88rem] flex-wrap items-center justify-between gap-3 px-6 py-6 lg:px-10">
        <span className="text-utility text-[var(--color-muted)]">© 2026 Charon</span>
        <span className="text-utility text-[var(--color-muted)]">Coin emblem by Brickclay · Noun Project</span>
      </div>
    </footer>
  );
}
