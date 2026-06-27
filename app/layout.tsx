import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Charon — tip any creator on the internet, instantly",
  description:
    "An AI agent that lets you send instant nanopayments to any creator on the internet — even if they've never signed up. Settled in under 500ms on Arc.",
};

function Nav() {
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/register", label: "For creators" },
    { href: "/stats", label: "Live stats" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_85%,transparent)] backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-gold)] text-sm font-bold text-black">
            ⲭ
          </span>
          <span>Charon</span>
        </Link>
        <div className="flex items-center gap-1 text-sm text-[var(--color-muted)]">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
      </body>
    </html>
  );
}
