"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Compass,
  LayoutDashboard,
  Library,
  Sparkles,
  Wallet,
  User,
  PenTool,
  Users,
  BarChart3,
  Banknote,
  BookOpen,
  CornerDownLeft,
} from "lucide-react";
import { coverFor } from "@/lib/covers";

interface Dest {
  label: string;
  href: string;
  hint: string;
  icon: typeof Compass;
  keywords: string;
}

const DESTINATIONS: Dest[] = [
  { label: "Discover", href: "/read", hint: "Browse", icon: Compass, keywords: "browse explore read stories series search" },
  { label: "Overview", href: "/dashboard", hint: "Reader", icon: LayoutDashboard, keywords: "dashboard home balance sessions" },
  { label: "Library", href: "/library", hint: "Reader", icon: Library, keywords: "saved following bookmarks continue" },
  { label: "Reading Agent", href: "/agent", hint: "Reader", icon: Sparkles, keywords: "ai autonomous agent budget taste" },
  { label: "Wallet", href: "/wallet", hint: "Reader", icon: Wallet, keywords: "balance deposit top up gift tips transactions funds" },
  { label: "Profile & settings", href: "/profile", hint: "Account", icon: User, keywords: "settings theme account username sign out" },
  { label: "Creator Studio", href: "/creator/studio", hint: "Studio", icon: PenTool, keywords: "creator studio series earnings publish" },
  { label: "Audience", href: "/creator/audience", hint: "Studio", icon: Users, keywords: "followers supporters readers fans" },
  { label: "Analytics", href: "/creator/analytics", hint: "Studio", icon: BarChart3, keywords: "stats performance completion reads" },
  { label: "Withdraw", href: "/creator/withdraw", hint: "Studio", icon: Banknote, keywords: "cash out payout bank usdc earnings" },
];

interface SeriesHit {
  id: string;
  slug?: string | null;
  title: string;
  genre: string | null;
  cover_image: string | null;
}

type Row = { type: "dest"; dest: Dest } | { type: "series"; s: SeriesHit };

/** ⌘K command palette — jump to any page/setting, or search the catalog. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [series, setSeries] = useState<SeriesHit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pull the (already cached) catalog once the palette opens.
  useEffect(() => {
    if (!open) return;
    setQ("");
    setSel(0);
    setTimeout(() => inputRef.current?.focus(), 30);
    try {
      const cached = sessionStorage.getItem("charon_cache:series:all");
      if (cached) setSeries((JSON.parse(cached)?.series ?? []) as SeriesHit[]);
    } catch {
      /* ignore */
    }
    fetch("/api/series?limit=200")
      .then((r) => r.json())
      .then((d) => setSeries(d.series ?? []))
      .catch(() => {});
  }, [open]);

  const rows = useMemo<Row[]>(() => {
    const term = q.trim().toLowerCase();
    const dests = DESTINATIONS.filter((d) => !term || (d.label + " " + d.hint + " " + d.keywords).toLowerCase().includes(term));
    const hits = term
      ? series.filter((s) => (s.title + " " + (s.genre ?? "")).toLowerCase().includes(term)).slice(0, 6)
      : [];
    return [...dests.map((d) => ({ type: "dest" as const, dest: d })), ...hits.map((s) => ({ type: "series" as const, s }))];
  }, [q, series]);

  useEffect(() => setSel(0), [q]);

  function go(row: Row) {
    onClose();
    if (row.type === "dest") router.push(row.dest.href);
    else router.push(`/series/${row.s.slug ?? row.s.id}`);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSel((s) => Math.min(rows.length - 1, s + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSel((s) => Math.max(0, s - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (rows[sel]) go(rows[sel]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rows, sel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh] w-screen h-screen" role="dialog" aria-modal="true">
      <div className="absolute inset-0 w-full h-full bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fade-up relative w-full max-w-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4">
          <Search size={17} className="text-[var(--color-muted)]" strokeWidth={1.75} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pages, settings, or series…"
            className="w-full bg-transparent py-4 text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)]"
          />
          <kbd className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[0.62rem] text-[var(--color-muted)]">esc</kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto scrollbar-thin py-2">
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--color-muted)]">No matches.</p>
          ) : (
            rows.map((row, i) => {
              const active = i === sel;
              const base = `flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${active ? "bg-[color-mix(in_srgb,var(--color-gold)_12%,transparent)]" : "hover:bg-[var(--color-surface-2)]"}`;
              if (row.type === "dest") {
                const Icon = row.dest.icon;
                return (
                  <button key={`d-${row.dest.href}`} onMouseEnter={() => setSel(i)} onClick={() => go(row)} className={base}>
                    <Icon size={16} className={active ? "text-[var(--color-gold)]" : "text-[var(--color-muted)]"} strokeWidth={1.6} />
                    <span className="flex-1 text-sm">{row.dest.label}</span>
                    <span className="text-utility text-[var(--color-muted)]">{row.dest.hint}</span>
                    {active && <CornerDownLeft size={13} className="text-[var(--color-muted)]" />}
                  </button>
                );
              }
              return (
                <button key={`s-${row.s.id}`} onMouseEnter={() => setSel(i)} onClick={() => go(row)} className={base}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverFor(row.s.id, row.s.cover_image)} alt="" className="h-9 w-6 shrink-0 border border-[var(--color-border)] object-cover grayscale-[0.15]" />
                  <span className="flex-1 truncate text-sm">{row.s.title}</span>
                  <span className="text-utility inline-flex items-center gap-1 text-[var(--color-muted)]"><BookOpen size={11} /> Series</span>
                  {active && <CornerDownLeft size={13} className="text-[var(--color-muted)]" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
