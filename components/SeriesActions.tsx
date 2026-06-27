"use client";

import { useEffect, useState } from "react";

const LS_KEY = "charon_user_id";

export function SeriesActions({
  seriesId,
  status,
}: {
  seriesId: string;
  status: string;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem(LS_KEY);
    setUserId(id);
    if (id) {
      fetch(`/api/follow?userId=${id}&seriesId=${seriesId}`)
        .then((r) => r.json())
        .then((d) => setMode(d.mode))
        .catch(() => {});
    }
  }, [seriesId]);

  async function setFollow(next: string) {
    if (!userId) return;
    setBusy(true);
    try {
      await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, seriesId, mode: next }),
      });
      setMode(next);
    } finally {
      setBusy(false);
    }
  }

  async function unlock() {
    if (!userId) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/series/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, seriesId }),
      });
      const d = await res.json();
      if (res.ok) {
        setMode("series_unlock");
        setMsg(`Unlocked for $${Number(d.amount).toFixed(2)} — read it all, no per-chapter charge.`);
      } else {
        setMsg(d.error ?? "unlock failed");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!userId) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        <a href="/dashboard" className="text-[var(--color-gold)]">
          Set up your wallet
        </a>{" "}
        to follow and read.
      </p>
    );
  }

  if (mode === "series_unlock") {
    return <p className="text-sm text-[var(--color-accent-2)]">✓ Series unlocked — enjoy.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        disabled={busy}
        onClick={() => setFollow(mode === "standard" ? "pre_release" : "standard")}
        className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
          mode === "pre_release"
            ? "border-[var(--color-gold)] text-[var(--color-gold)]"
            : "border-[var(--color-border)] text-[var(--color-muted)]"
        }`}
      >
        {mode === "pre_release" ? "✓ Pre-release on" : mode ? "Enable pre-release" : "Follow + pre-release"}
      </button>
      {mode === null && (
        <button
          disabled={busy}
          onClick={() => setFollow("standard")}
          className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium"
        >
          Follow
        </button>
      )}
      {status === "completed" && (
        <button
          disabled={busy}
          onClick={unlock}
          className="rounded-full bg-[var(--color-gold)] px-3 py-1.5 text-sm font-semibold text-black"
        >
          Unlock whole series
        </button>
      )}
      {msg && <span className="text-sm text-[var(--color-accent-2)]">{msg}</span>}
    </div>
  );
}
