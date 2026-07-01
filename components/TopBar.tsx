"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BetaBadge } from "@/components/BetaBadge";
import { useScrollHide } from "@/lib/use-scroll-hide";

// App surfaces render their own AccountNav header, so the marketing TopBar is
// hidden there. The /creator marketing landing keeps it; /creator/* app pages don't.
const HIDDEN_PREFIXES = ["/join", "/onboarding", "/dashboard", "/library", "/wallet", "/agent", "/read", "/chapter", "/profile", "/series", "/author", "/admin"];

function isHidden(pathname: string) {
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  if (pathname.startsWith("/creator/")) return true; // creator app pages (not the /creator landing)
  return false;
}

export function TopBar() {
  const pathname = usePathname();
  const hidden = useScrollHide();
  if (isHidden(pathname)) return null;

  const links = [
    { href: "/read", label: "Browse" },
    { href: "/creator", label: "Creators" },
    { href: "/stats", label: "Live" },
  ];
  return (
    <header
      className={`sticky top-0 z-40 bg-[color-mix(in_srgb,var(--color-bg)_80%,transparent)] backdrop-blur transition-transform duration-300 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <nav className="mx-auto flex max-w-[88rem] items-center justify-between px-6 py-4 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Charon">
          <Logo size={42} className="text-[var(--color-gold)]" />
          <span className="hidden flex-col leading-none sm:flex">
            <span className="font-display text-3xl font-semibold leading-none tracking-tight text-coin">Charon</span>
            <BetaBadge className="mt-0.5" />
          </span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hidden px-3 py-2 text-utility text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)] sm:inline-block"
            >
              {l.label}
            </Link>
          ))}
          <ThemeToggle />
          <Link href="/dashboard" className="btn-outline hidden md:inline-flex">
            Sign in
          </Link>
          <Link href="/read" className="btn-coin">
            Read
          </Link>
        </div>
      </nav>
    </header>
  );
}
