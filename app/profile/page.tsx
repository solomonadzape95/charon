"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, PenLine, BarChart3, Shield } from "lucide-react";
import { AccountNav } from "@/components/AccountNav";
import { ThemeSelector } from "@/components/ThemeToggle";
import { Loading } from "@/components/Loading";
import { getUserId, getEmail, getCreatorId, resolveCreatorId, signOutEverywhere, getUsername, setUsername } from "@/lib/account";

interface User {
  id: string;
  email: string | null;
  balance_usd: number;
}

const NOTIF_KEY = "charon_notif";
const WALLET_KEY = "charon_wallet";
const NOTIFS = [
  { id: "newChapters", label: "New chapters", desc: "When a series you follow drops a chapter." },
  { id: "settlements", label: "Session receipts", desc: "A summary after each reading session." },
  { id: "recommendations", label: "Recommendations", desc: "Occasional picks from Agent 4." },
] as const;

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [notif, setNotif] = useState<Record<string, boolean>>({ newChapters: true, settlements: true, recommendations: false });
  const [wallet, setWallet] = useState("");
  const [savedWallet, setSavedWallet] = useState(false);
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const id = getUserId();
    if (!id) {
      router.replace("/join");
      return;
    }
    setIsCreator(!!getCreatorId());
    setName(getUsername());
    try {
      const n = localStorage.getItem(NOTIF_KEY);
      if (n) setNotif((p) => ({ ...p, ...JSON.parse(n) }));
      setWallet(localStorage.getItem(WALLET_KEY) ?? "");
    } catch {
      /* ignore */
    }
    // Resolve everything before showing the page, so it opens fully-formed (no reflow).
    Promise.all([
      fetch(`/api/users?id=${id}`).then((r) => r.json()).then((d) => d.user && setUser(d.user)).catch(() => {}),
      resolveCreatorId().then((cid) => setIsCreator(!!cid)).catch(() => {}),
      fetch("/api/admin/me").then((r) => r.json()).then((d) => setIsAdmin(!!d.isAdmin)).catch(() => {}),
    ]).finally(() => setLoaded(true));
  }, [router]);

  function toggle(key: string) {
    setNotif((p) => {
      const next = { ...p, [key]: !p[key] };
      try {
        localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function saveWallet() {
    try {
      localStorage.setItem(WALLET_KEY, wallet.trim());
      setSavedWallet(true);
      setTimeout(() => setSavedWallet(false), 1500);
    } catch {
      /* ignore */
    }
  }

  function saveName() {
    const v = name.trim();
    if (!v) return;
    setUsername(v);
    setSavedName(true);
    setTimeout(() => setSavedName(false), 1500);
  }

  async function signOut() {
    await signOutEverywhere();
    router.push("/");
  }

  const email = user?.email ?? getEmail();

  if (!loaded) {
    return (
      <>
        <AccountNav />
        <Loading label="Loading your profile…" />
      </>
    );
  }

  return (
    <>
      <AccountNav />
      <div className="mx-auto max-w-5xl space-y-10 px-6 py-10">
        <div>
          <h1 className="font-display display-md font-semibold">Profile & settings</h1>
          <p className="mt-1 text-[var(--color-muted)]">{email}</p>
        </div>

        {/* Account */}
        <Section title="Account">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--color-border)] py-3">
            <div className="flex-1">
              <label className="text-sm text-[var(--color-muted)]">Username</label>
              <div className="mt-1 flex items-center gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-gold)] text-sm font-semibold text-black">
                  {(name[0] ?? "R").toUpperCase()}
                </span>
                <input value={name} onChange={(e) => setName(e.target.value)} className="charon-input max-w-xs" placeholder="username" />
                <button onClick={saveName} className="btn-outline shrink-0">
                  {savedName ? "Saved ✓" : "Save"}
                </button>
              </div>
            </div>
          </div>
          <Field label="Email" value={email ?? "n/a"} />
          <Field label="Balance" value={user ? `$${Number(user.balance_usd).toFixed(2)}` : "n/a"} action={<Link href="/wallet" className="text-utility text-[var(--color-gold)]">Manage →</Link>} />
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-[var(--color-muted)]">Applies across the app. Reading has its own settings in the reader.</p>
            </div>
            <ThemeSelector />
          </div>
        </Section>

        {/* Creator */}
        <Section title="Creator">
          {isCreator ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[var(--color-muted)]">You publish on Charon.</p>
              <div className="flex gap-2">
                <Link href="/dashboard" className="btn-outline">
                  <BarChart3 size={14} /> Studio
                </Link>
                <Link href="/creator/analytics" className="btn-outline">
                  Analytics
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[var(--color-muted)]">Publish your series and earn per chapter, per reader.</p>
              <Link href="/creator/onboarding" className="btn-coin">
                <PenLine size={14} /> Become a creator
              </Link>
            </div>
          )}
        </Section>

        {/* Admin */}
        {isAdmin && (
          <Section title="Admin">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[var(--color-muted)]">You have platform admin access.</p>
              <Link href="/admin" className="btn-coin">
                <Shield size={14} /> Open admin
              </Link>
            </div>
          </Section>
        )}

        {/* Notifications */}
        <Section title="Notifications">
          <div className="space-y-1">
            {NOTIFS.map((n) => (
              <div key={n.id} className="flex items-center justify-between gap-4 py-2">
                <div>
                  <p className="text-sm font-medium">{n.label}</p>
                  <p className="text-xs text-[var(--color-muted)]">{n.desc}</p>
                </div>
                <Toggle on={!!notif[n.id]} onClick={() => toggle(n.id)} />
              </div>
            ))}
          </div>
        </Section>

        {/* Connected wallet */}
        <Section title="Connected wallet (optional)">
          <p className="text-xs text-[var(--color-muted)]">Link a USDC wallet on Arc to receive refunds or future payouts.</p>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="0x…"
              className="charon-input font-mono text-sm"
            />
            <button onClick={saveWallet} className="btn-outline shrink-0">
              {savedWallet ? "Saved ✓" : "Save"}
            </button>
          </div>
        </Section>

        <div className="border-t border-[var(--color-border)] pt-6">
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-5 py-2.5 text-utility text-[var(--color-muted)] transition-colors hover:border-red-400 hover:text-red-400"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <h2 className="text-utility text-[var(--color-gold)]">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value, action }: { label: string; value: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] py-2 last:border-0">
      <span className="text-sm text-[var(--color-muted)]">{label}</span>
      <span className="flex items-center gap-3">
        <span className="tabular text-sm">{value}</span>
        {action}
      </span>
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
        on ? "border-[var(--color-gold)] bg-[var(--color-gold)]" : "border-[var(--color-border)] bg-[var(--color-surface-2)]"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full shadow-sm transition-transform ${
          on ? "translate-x-[1.5rem] bg-black" : "translate-x-1 bg-[var(--color-muted)]"
        }`}
      />
    </button>
  );
}
