"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { getUserId } from "@/lib/account";

// App routes that should show the in-app footer (excludes marketing pages, which
// have their own BigFooter, and the immersive reader / focused onboarding flows).
const APP_PREFIXES = ["/dashboard", "/library", "/wallet", "/read", "/profile", "/series", "/creator/"];
const EXCLUDE = ["/creator/onboarding"];

const COLS = [
  { head: "Read", links: [{ label: "Discover", href: "/read" }, { label: "Library", href: "/library" }, { label: "Wallet", href: "/wallet" }] },
  { head: "Account", links: [{ label: "Overview", href: "/dashboard" }, { label: "Profile", href: "/profile" }, { label: "Become a creator", href: "/creator/onboarding" }] },
  { head: "Built on", links: [{ label: "Arc", href: "https://testnet.arcscan.app" }, { label: "Circle", href: "https://circle.com" }, { label: "Live stats", href: "/stats" }] },
];

export function AppFooter() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(!!getUserId());
  }, [pathname]);

  const onApp = APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p)) && !EXCLUDE.some((p) => pathname.startsWith(p));
  if (!signedIn || !onApp) return null;

  return (
    <footer className="mt-16 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-y-8 px-6 py-12 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo size={26} className="text-[var(--color-gold)]" />
            <span className="font-display text-xl font-semibold text-coin">Charon</span>
          </Link>
          <p className="mt-3 max-w-[12rem] text-sm text-[var(--color-muted)]">Read freely. Pay for what it&apos;s worth.</p>
        </div>
        {COLS.map((c) => (
          <div key={c.head} className="flex flex-col gap-2.5">
            <span className="text-utility text-[var(--color-muted)]">{c.head}</span>
            {c.links.map((l) => (
              <Link key={l.label} href={l.href} className="w-fit text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]">
                {l.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      {/* Massive wordmark — the "O" is the coin */}
      <div className="overflow-hidden px-6">
        <div
          className="font-display flex items-center justify-center font-bold leading-[0.8] tracking-tight text-coin"
          style={{ fontSize: "clamp(3.5rem, 18vw, 13rem)" }}
        >
          <span>CHAR</span>
          <Logo className="mx-[0.02em] inline-block text-[var(--color-gold)]" />
          <span>N</span>
        </div>
      </div>

      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-utility text-[var(--color-muted)]">© 2026 Charon</span>
        <span className="text-utility text-[var(--color-muted)]">USDC · settled on Arc</span>
      </div>
    </footer>
  );
}
