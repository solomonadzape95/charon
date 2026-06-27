"use client";

import { useState } from "react";

interface StartResp {
  creatorId: string;
  slug: string;
  claimToken: string;
  platform: string;
  handle: string;
  code: string;
  instructions: string;
  proofRequired: boolean;
}

export default function RegisterPage() {
  const [platformUrl, setPlatformUrl] = useState("");
  const [wallet, setWallet] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [proofUrl, setProofUrl] = useState("");

  const [start, setStart] = useState<StartResp | null>(null);
  const [done, setDone] = useState<{ slug: string; claimUrl?: string; pendingBalanceUsd?: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function getCode() {
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/creators/register/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformUrl, walletAddress: wallet, name, bio }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setStart(j);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!start) return;
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/creators/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimToken: start.claimToken,
          platform: start.platform,
          handle: start.handle,
          proofUrl: proofUrl || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.verified) throw new Error(j.error ?? "not verified yet");
      setDone({ slug: j.slug, claimUrl: j.claimUrl, pendingBalanceUsd: j.pendingBalanceUsd });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md space-y-5 pt-10">
        <h1 className="text-2xl font-semibold">✓ You&apos;re verified</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Tips to your content now route straight to your wallet — no escrow, no claim step.
        </p>
        <a
          href={`/c/${done.slug}`}
          className="inline-block rounded-lg bg-[var(--color-gold)] px-4 py-2 font-medium text-black"
        >
          View your profile → /c/{done.slug}
        </a>
        {done.claimUrl && (done.pendingBalanceUsd ?? 0) > 0 && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-sm">
              You already have <strong>${(done.pendingBalanceUsd ?? 0).toFixed(2)}</strong> in tips waiting from before
              you registered.
            </p>
            <a href={done.claimUrl} className="mt-2 inline-block text-sm text-[var(--color-accent-2)]">
              Claim it now →
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5 pt-10">
      <div>
        <h1 className="text-2xl font-semibold">Register as a creator</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Link a profile + wallet so tips reach you directly. Takes about a minute.
        </p>
      </div>

      {!start ? (
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-[var(--color-muted)]">Your profile URL</span>
            <input
              className="charon-input mt-1"
              placeholder="https://x.com/you · youtube.com/@you · you.substack.com · github.com/you"
              value={platformUrl}
              onChange={(e) => setPlatformUrl(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--color-muted)]">Payout wallet (0x…)</span>
            <input
              className="charon-input mt-1"
              placeholder="0x…"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--color-muted)]">Display name (optional)</span>
            <input className="charon-input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--color-muted)]">Bio (optional)</span>
            <input className="charon-input mt-1" value={bio} onChange={(e) => setBio(e.target.value)} />
          </label>
          <button
            onClick={getCode}
            disabled={busy || !platformUrl || !/^0x[a-fA-F0-9]{40}$/.test(wallet)}
            className="w-full rounded-lg bg-[var(--color-gold)] px-4 py-2.5 font-medium text-black disabled:opacity-50"
          >
            {busy ? "…" : "Get verification code"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Your one-time code</div>
            <code className="mt-1 block select-all text-lg font-semibold text-[var(--color-gold)]">{start.code}</code>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{start.instructions}</p>
          </div>

          {start.proofRequired && (
            <label className="block text-sm">
              <span className="text-[var(--color-muted)]">Proof URL (the public tweet containing your code)</span>
              <input
                className="charon-input mt-1"
                placeholder="https://x.com/you/status/…"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
              />
            </label>
          )}

          <button
            onClick={verify}
            disabled={busy || (start.proofRequired && !proofUrl)}
            className="w-full rounded-lg bg-[var(--color-accent-2)] px-4 py-2.5 font-medium text-black disabled:opacity-50"
          >
            {busy ? "Checking…" : "I've added it — verify"}
          </button>
          <button onClick={() => setStart(null)} className="w-full text-sm text-[var(--color-muted)]">
            ← start over
          </button>
        </div>
      )}

      {err && <p className="text-sm text-red-400">{err}</p>}
    </div>
  );
}
