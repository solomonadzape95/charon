import type { Metadata } from "next";
import Link from "next/link";
import { Cinzel, EB_Garamond, DM_Mono } from "next/font/google";
import { Logo } from "@/components/Logo";
import "./globals.css";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-cinzel" });
const garamond = EB_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-garamond" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono" });

export const metadata: Metadata = {
  title: "Charon — read freely, pay fairly",
  description:
    "A nanopayment reading platform where AI agents settle what every chapter was truly worth. Read webnovels and manga; value flows automatically to creators on Arc.",
};

function TopBar() {
  const links = [
    { href: "/read", label: "Browse" },
    { href: "/creator", label: "Creators" },
    { href: "/stats", label: "Live" },
  ];
  return (
    <header className="sticky top-0 z-40 bg-[color-mix(in_srgb,var(--color-bg)_80%,transparent)] backdrop-blur">
      <nav className="mx-auto flex max-w-[88rem] items-center justify-between px-6 py-4 lg:px-10">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="Charon">
          <Logo size={34} className="text-[var(--color-gold)]" />
          <span className="font-display text-2xl font-semibold tracking-tight text-coin">Charon</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hidden rounded-md px-3 py-2 text-utility text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)] sm:inline-block"
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${garamond.variable} ${dmMono.variable}`}>
      <body>
        <TopBar />
        <main className="min-h-[calc(100vh-4.5rem)]">{children}</main>
      </body>
    </html>
  );
}
