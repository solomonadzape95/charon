"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/creators", label: "Creators" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/reviews", label: "Reviews" },
];

export function AdminNav({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_85%,transparent)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <Link href="/admin" className="flex items-center gap-2.5">
          <Logo size={30} className="text-[var(--color-gold)]" />
          <span className="font-display text-xl font-semibold tracking-tight">
            Charon <span className="text-[var(--color-gold)]">Admin</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {email && <span className="tabular hidden text-sm text-[var(--color-muted)] md:inline">{email}</span>}
          <Link href="/dashboard" className="btn-outline">
            View app →
          </Link>
          <button onClick={signOut} className="btn-outline">
            Sign out
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 pb-2.5">
        <nav className="flex gap-1 overflow-x-auto scrollbar-thin">
          {TABS.map((t) => {
            const active = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-utility transition-colors ${
                  active ? "bg-[color-mix(in_srgb,var(--color-gold)_14%,transparent)] text-coin" : "text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
