"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";
import { Logo } from "@/components/Logo";
import { Loading } from "@/components/Loading";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<{ ok: boolean; email: string | null } | null>(null);

  // Re-check on every admin route change. Crucially this re-runs after a
  // successful login navigates /admin/login → /admin (the layout doesn't
  // remount across that nav, so a one-shot `[]` effect would keep serving the
  // stale "not an admin" result it cached while on the login page).
  useEffect(() => {
    if (pathname === "/admin/login") return;
    let cancelled = false;
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => !cancelled && setState({ ok: !!d.isAdmin, email: d.email ?? null }))
      .catch(() => !cancelled && setState({ ok: false, email: null }));
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // The login page is the one /admin/* route that must render without the guard.
  if (pathname === "/admin/login") return <>{children}</>;

  if (state === null) return <Loading full label="Loading admin…" />;

  if (!state.ok) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="max-w-sm text-center">
          <Logo size={48} className="mx-auto text-[var(--color-gold)]" />
          <h1 className="font-display mt-5 text-2xl font-semibold">Admins only</h1>
          <p className="mt-2 text-[var(--color-muted)]">This area is restricted. Sign in to continue.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/admin/login" className="btn-coin">
              Admin sign in
            </Link>
            <Link href="/" className="btn-outline">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminNav email={state.email} />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </>
  );
}
