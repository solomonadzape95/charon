"use client";

import { use, useState } from "react";
import Link from "next/link";

export default function UploadPage({ params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId } = use(params);
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<"text" | "images">("text");
  const [content, setContent] = useState("");
  const [override, setOverride] = useState("");
  const [earlyAccess, setEarlyAccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ price: number; reasoning: string; chapterId: string; unlocks: number } | null>(null);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seriesId,
          title: title || undefined,
          contentType,
          content,
          earlyAccess,
          overrideBasePrice: override ? Number(override) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "upload failed");
        return;
      }
      setResult({
        price: Number(data.chapter.base_price_usdc),
        reasoning: data.pricingReasoning,
        chapterId: data.chapter.id,
        unlocks: Number(data.preReleaseUnlocks) || 0,
      });
      setTitle("");
      setContent("");
      setOverride("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/creator" className="text-sm text-[var(--color-muted)]">
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Upload a chapter</h1>
        <p className="text-sm text-[var(--color-muted)]">
          The pricing agent sets a base price automatically. Override it only if you want to.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <input
          placeholder="Chapter title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />

        <div className="flex gap-2 text-sm">
          {(["text", "images"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setContentType(t)}
              className={`rounded-lg border px-3 py-1.5 ${
                contentType === t
                  ? "border-[var(--color-gold)] text-[var(--color-gold)]"
                  : "border-[var(--color-border)] text-[var(--color-muted)]"
              }`}
            >
              {t === "text" ? "Text" : "Images (manga)"}
            </button>
          ))}
        </div>

        <textarea
          required
          placeholder={
            contentType === "text"
              ? "Paste your chapter text…"
              : 'Image URLs — one per line, or a JSON array ["https://…", "https://…"]'
          }
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="h-72 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-sm"
        />

        <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <input type="checkbox" checked={earlyAccess} onChange={(e) => setEarlyAccess(e.target.checked)} />
          Early-access drop — pre-release subscribers are auto-charged & unlocked instantly
        </label>

        <div className="flex items-center gap-3">
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Override price (optional)"
            value={override}
            onChange={(e) => setOverride(e.target.value)}
            className="w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          />
          <button
            disabled={busy}
            className="rounded-lg bg-[var(--color-gold)] px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
          >
            {busy ? "Pricing…" : "Publish chapter"}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {result && (
        <div className="rounded-2xl border border-[var(--color-gold)] bg-[var(--color-surface)] p-5">
          <p className="text-sm text-[var(--color-muted)]">Agent priced this chapter at</p>
          <p className="text-3xl font-bold text-[var(--color-gold)]">${result.price.toFixed(2)}</p>
          <p className="mt-2 text-sm">{result.reasoning}</p>
          {result.unlocks > 0 && (
            <p className="mt-1 text-sm text-[var(--color-accent-2)]">
              Auto-paid & unlocked for {result.unlocks} pre-release subscriber{result.unlocks > 1 ? "s" : ""}.
            </p>
          )}
          <Link href={`/chapter/${result.chapterId}`} className="mt-3 inline-block text-sm text-[var(--color-gold)]">
            Preview chapter →
          </Link>
        </div>
      )}
    </div>
  );
}
