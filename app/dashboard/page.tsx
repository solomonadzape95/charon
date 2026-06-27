"use client";

import { useCallback, useEffect, useState } from "react";

interface User {
  id: string;
  email: string | null;
  telegram_id: string | null;
  link_token: string | null;
  balance_usd: number;
  session_cap_usd: number;
}

interface Tip {
  id: string;
  url: string;
  platform: string | null;
  amount_usd: number;
  status: string;
  created_at: string;
}

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [tips, setTips] = useState<Tip[]>([]);
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("5");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async (id: string) => {
    const [u, h] = await Promise.all([
      fetch(`/api/users?id=${id}`).then((r) => r.json()),
      fetch(`/api/tip?userId=${id}`).then((r) => r.json()),
    ]);
    if (u.user) setUser(u.user);
    setTips(h.tips ?? []);
  }, []);

  useEffect(() => {
    const id = localStorage.getItem("charon_user_id");
    if (id) refresh(id);
  }, [refresh]);

  async function signup() {
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      localStorage.setItem("charon_user_id", j.user.id);
      setUser(j.user);
      await refresh(j.user.id);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function topUp() {
    if (!user) return;
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, amountUsd: Number(amount) }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      await refresh(user.id);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem("charon_user_id");
    setUser(null);
    setTips([]);
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-5 pt-10">
        <h1 className="text-2xl font-semibold">Sign in to Charon</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Your reader home base — top up your balance, link Telegram, and see every tip you&apos;ve sent.
        </p>
        <input
          className="charon-input"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          onClick={signup}
          disabled={busy || !email.includes("@")}
          className="w-full rounded-lg bg-[var(--color-gold)] px-4 py-2.5 font-medium text-black disabled:opacity-50"
        >
          {busy ? "…" : "Continue"}
        </button>
        {err && <p className="text-sm text-red-400">{err}</p>}
      </div>
    );
  }

  const tgLink = user.link_token && BOT ? `https://t.me/${BOT}?start=${user.link_token}` : null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{user.email}</h1>
          <p className="text-sm text-[var(--color-muted)]">Reader dashboard</p>
        </div>
        <button onClick={logout} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
          Sign out
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Balance</div>
          <div className="text-3xl font-semibold">${Number(user.balance_usd).toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Session cap</div>
          <div className="text-3xl font-semibold">${Number(user.session_cap_usd).toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Telegram</div>
          <div className="text-lg font-medium">{user.telegram_id ? "✅ Linked" : "Not linked"}</div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h3 className="mb-3 font-semibold">Top up balance</h3>
          <div className="flex gap-2">
            <input
              className="charon-input"
              type="number"
              min="1"
              max="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button
              onClick={topUp}
              disabled={busy}
              className="whitespace-nowrap rounded-lg bg-[var(--color-accent)] px-4 py-2 font-medium text-black disabled:opacity-50"
            >
              {busy ? "…" : "Deposit"}
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--color-muted)]">Testnet USDC, held in the pooled Arc treasury.</p>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h3 className="mb-3 font-semibold">Connect Telegram</h3>
          {user.telegram_id ? (
            <p className="text-sm text-[var(--color-muted)]">Linked. Send <code>/tip &lt;url&gt;</code> to the bot.</p>
          ) : tgLink ? (
            <a
              href={tgLink}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-lg bg-[var(--color-surface-2)] px-4 py-2 font-medium hover:bg-[var(--color-border)]"
            >
              Open Telegram & link →
            </a>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">
              {BOT ? "Already linked or token used." : "Set NEXT_PUBLIC_TELEGRAM_BOT_USERNAME to enable."}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-3 font-semibold">Connect browser extension</h3>
        <p className="mb-3 text-sm text-[var(--color-muted)]">
          Install the Charon extension, open it, and paste this reader ID to tip any page in one click.
        </p>
        <div className="flex gap-2">
          <input className="charon-input font-mono text-xs" readOnly value={user.id} />
          <button
            onClick={() => navigator.clipboard?.writeText(user.id)}
            className="whitespace-nowrap rounded-lg bg-[var(--color-surface-2)] px-4 py-2 font-medium hover:bg-[var(--color-border)]"
          >
            Copy
          </button>
        </div>
      </div>

      {err && <p className="text-sm text-red-400">{err}</p>}

      <div>
        <h3 className="mb-3 font-semibold">Tip history</h3>
        {tips.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No tips yet — send one via Telegram.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface-2)] text-left text-[var(--color-muted)]">
                <tr>
                  <th className="px-4 py-2 font-medium">Amount</th>
                  <th className="px-4 py-2 font-medium">Platform</th>
                  <th className="px-4 py-2 font-medium">URL</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {tips.map((t) => (
                  <tr key={t.id} className="border-t border-[var(--color-border)]">
                    <td className="px-4 py-2 font-medium">${Number(t.amount_usd).toFixed(2)}</td>
                    <td className="px-4 py-2 text-[var(--color-muted)]">{t.platform ?? "web"}</td>
                    <td className="max-w-[260px] truncate px-4 py-2 text-[var(--color-muted)]">{t.url}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    sent: "text-[var(--color-accent-2)]",
    escrowed: "text-[var(--color-gold)]",
    claimed: "text-[var(--color-accent)]",
    failed: "text-red-400",
    pending_confirmation: "text-[var(--color-muted)]",
  };
  return <span className={map[status] ?? "text-[var(--color-muted)]"}>{status}</span>;
}
