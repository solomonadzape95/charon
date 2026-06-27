"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

const HIDDEN_ON = ["/join", "/creator/join"];

export function TopBar() {
  const pathname = usePathname();
  if (HIDDEN_ON.includes(pathname)) return null;

  const links = [
    { href: "/read", label: "Browse" },
    { href: "/creator", label: "Creators" },
    { href: "/stats", label: "Live" },
  ];
  return (
    <header className="sticky top-0 z-40 bg-[color-mix(in_srgb,var(--color-bg)_80%,transparent)] backdrop-blur">
      <nav className="mx-auto flex max-w-[88rem] items-center justify-between px-6 py-4 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Charon">
          <Logo size={46} className="text-[var(--color-gold)]" />
          <span className="font-display text-3xl font-semibold tracking-tight text-coin">Charon</span>
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
