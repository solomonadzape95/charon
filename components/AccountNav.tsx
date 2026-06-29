"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PenLine, LogOut, Search, Menu, X, BookOpen, PenTool } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CommandPalette } from "@/components/CommandPalette";
import { getUserId, getUsername, getCreatorId, resolveCreatorId, signOutEverywhere } from "@/lib/account";
import { getMode, setMode, onModeChange, isStudioPath, type AppMode } from "@/lib/mode";
import { useScrollHide } from "@/lib/use-scroll-hide";

const READER_TABS = [
  { href: "/read", label: "Discover" },
  { href: "/dashboard", label: "Overview" },
  { href: "/library", label: "Library" },
  { href: "/agent", label: "Agent" },
  { href: "/wallet", label: "Wallet" },
];

const STUDIO_TABS = [
  { href: "/creator/studio", label: "Studio" },
  { href: "/creator/audience", label: "Audience" },
  { href: "/creator/analytics", label: "Analytics" },
  { href: "/creator/withdraw", label: "Withdraw" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const hidden = useScrollHide();
  const [username, setUsername] = useState<string>("");
  const [isCreator, setIsCreator] = useState(false);
  const [mode, setModeState] = useState<AppMode>("read");
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    setUsername(getUsername());
    setIsCreator(!!getCreatorId());
    setModeState(getMode());
    setReady(true);
    resolveCreatorId().then((id) => setIsCreator(!!id));
    return onModeChange(setModeState);
  }, [pathname]);

  // ⌘K / Ctrl+K → open the command palette.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The studio is shown when the path is a studio path, or when the account has
  // chosen studio mode and is on a neutral page (e.g. profile).
  const studioView = isStudioPath(pathname) || (mode === "studio" && pathname === "/profile");

  // Close the mobile menu on navigation.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const signedIn = !!getUserId();
  const tabs = studioView ? STUDIO_TABS : READER_TABS;

  async function signOut() {
    await signOutEverywhere();
    router.push("/");
  }

  function switchMode(next: AppMode) {
    setMode(next);
    setModeState(next);
    setMenuOpen(false);
    router.push(next === "studio" ? "/creator/studio" : "/dashboard");
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    setMenuOpen(false);
    router.push(q.trim() ? `/read?q=${encodeURIComponent(q.trim())}` : "/read");
  }

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-[color-mix(in_srgb,var(--color-bg)_85%,transparent)] backdrop-blur transition-transform duration-300 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      } ${studioView ? "border-[color-mix(in_srgb,var(--color-gold)_30%,var(--color-border))]" : "border-[var(--color-border)]"}`}
    >
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-3.5">
        <Link href={signedIn ? (studioView ? "/creator/studio" : "/dashboard") : "/"} className="flex shrink-0 items-center gap-2.5" aria-label="Charon">
          <Logo size={32} className="text-[var(--color-gold)]" />
          <span className="font-display hidden text-2xl font-semibold tracking-tight text-coin sm:inline">Charon</span>
        </Link>

        {/* Search — opens the command palette */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="relative hidden max-w-xs flex-1 items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-10 pr-12 text-left text-sm text-[var(--color-muted)] transition-colors hover:border-[var(--color-gold)] sm:flex"
        >
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" strokeWidth={1.75} />
          Search…
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 py-0.5 text-[0.62rem] font-medium md:block">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-2.5">
          {ready && signedIn ? (
            <>
              {/* Desktop cluster */}
              <div className="hidden items-center gap-2.5 sm:flex">
                {isCreator ? (
                  <ModeSwitch mode={studioView ? "studio" : "read"} onSwitch={switchMode} />
                ) : (
                  <Link href="/creator/onboarding" className="btn-outline hidden md:inline-flex">
                    <PenLine size={14} /> Become a creator
                  </Link>
                )}
                <ThemeToggle />
                <button onClick={signOut} aria-label="Sign out" title="Sign out" className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-muted)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-ink)]">
                  <LogOut size={15} />
                </button>
              </div>

              {/* Profile avatar (always) */}
              <Link
                href="/profile"
                title="Profile & settings"
                className="flex items-center gap-2 rounded-full border border-[var(--color-border)] py-1 pl-1 transition-colors hover:border-[var(--color-gold)] sm:pr-3"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-gold)] text-sm font-semibold text-black">
                  {(username[0] ?? "R").toUpperCase()}
                </span>
                <span className="hidden max-w-[8rem] truncate text-sm text-[var(--color-ink)] md:inline">{username}</span>
              </Link>

              {/* Mobile menu button */}
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Menu"
                title="Menu"
                className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)] sm:hidden"
              >
                {menuOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            </>
          ) : (
            <>
              <ThemeToggle />
              <Link href="/join" className="btn-coin">
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && signedIn && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-4 sm:hidden">
          {!studioView && (
            <form onSubmit={search} className="relative mb-3">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" strokeWidth={1.75} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search series…"
                className="w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-10 pr-4 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-gold)]"
              />
            </form>
          )}
          <div className="flex items-center justify-between">
            {isCreator ? (
              <ModeSwitch mode={studioView ? "studio" : "read"} onSwitch={switchMode} />
            ) : (
              <Link href="/creator/onboarding" className="btn-outline">
                <PenLine size={14} /> Become a creator
              </Link>
            )}
            <div className="flex items-center gap-2.5">
              <ThemeToggle />
              <button onClick={signOut} aria-label="Sign out" title="Sign out" className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ink)]">
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section tabs */}
      <div className="mx-auto max-w-5xl px-6 pb-2.5">
        <nav className="flex gap-1 overflow-x-auto scrollbar-thin">
          {tabs.map((t) => {
            const active = isActive(pathname, t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`relative whitespace-nowrap rounded-full px-4 py-1.5 text-utility transition-colors ${
                  active ? "bg-[color-mix(in_srgb,var(--color-gold)_14%,transparent)] text-coin" : "text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}

/** Segmented Reading ↔ Studio switch — the single bridge between the two surfaces. */
function ModeSwitch({ mode, onSwitch }: { mode: AppMode; onSwitch: (m: AppMode) => void }) {
  return (
    <div className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
      <button
        onClick={() => onSwitch("read")}
        aria-pressed={mode === "read"}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-utility transition-colors ${
          mode === "read" ? "bg-[var(--color-gold)] text-black" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        }`}
      >
        <BookOpen size={13} /> Read
      </button>
      <button
        onClick={() => onSwitch("studio")}
        aria-pressed={mode === "studio"}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-utility transition-colors ${
          mode === "studio" ? "bg-[var(--color-gold)] text-black" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        }`}
      >
        <PenTool size={13} /> Studio
      </button>
    </div>
  );
}
