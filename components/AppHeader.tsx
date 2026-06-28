"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AccountNav } from "@/components/AccountNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getUserId } from "@/lib/account";
import { useScrollHide } from "@/lib/use-scroll-hide";

const LINKS = [
  { href: "/read", label: "Browse" },
  { href: "/creator", label: "Creators" },
  { href: "/stats", label: "Live" },
];

/**
 * Header for pages that are viewable signed-in or signed-out (e.g. a series
 * page). Authenticated → the in-app AccountNav; guest → a marketing header.
 */
export function AppHeader() {
  const hidden = useScrollHide();
  const [signedIn, setSignedIn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSignedIn(!!getUserId());
    setReady(true);
  }, []);

  if (ready && signedIn) return <AccountNav />;

  // Guest / pre-hydration: marketing header.
  return (
    <header
      className={`sticky top-0 z-40 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_85%,transparent)] backdrop-blur transition-transform duration-300 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Charon">
          <Logo size={32} className="text-[var(--color-gold)]" />
          <span className="font-display hidden text-2xl font-semibold tracking-tight text-coin sm:inline">Charon</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hidden px-3 py-2 text-utility text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)] sm:inline-block"
            >
              {l.label}
            </Link>
          ))}
          <ThemeToggle />
          <Link href="/join" className="btn-coin">
            Sign in
          </Link>
        </div>
      </nav>
    </header>
  );
}
