"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Check } from "lucide-react";
import { ChapterEditor } from "@/components/ChapterEditor";
import { PanelUpload } from "@/components/ImageUpload";

export default function UploadPage({ params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId } = use(params);
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<"text" | "images">("text");
  const [html, setHtml] = useState("");
  const [panels, setPanels] = useState<string[]>([]);
  const [override, setOverride] = useState("");
  const [earlyAccess, setEarlyAccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ price: number; reasoning: string; chapterId: string; unlocks: number } | null>(null);
  const [error, setError] = useState("");

  async function importDocx(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/import/docx", { method: "POST", body: fd });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error ?? "import failed");
    return d.html as string;
  }
  async function importGDocs(url: string): Promise<string> {
    const res = await fetch("/api/import/gdocs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error ?? "import failed");
    return d.html as string;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const content = contentType === "images" ? JSON.stringify(panels) : html;
    if (contentType === "images" && panels.length === 0) {
      setError("Add at least one panel image.");
      return;
    }
    if (contentType === "text" && !html.replace(/<[^>]+>/g, "").trim()) {
      setError("Write or import some chapter text.");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId, title: title || undefined, contentType, content, earlyAccess, overrideBasePrice: override ? Number(override) : undefined }),
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
      setHtml("");
      setPanels([]);
      setOverride("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <div>
        <Link href={`/creator/${seriesId}`} className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
          <ArrowLeft size={15} /> Back to series
        </Link>
        <h1 className="font-display display-md mt-2 font-semibold">Upload a chapter</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Write here, or import from .txt / .docx / a Google Docs link. The pricing agent sets a fair base price on publish.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <input placeholder="Chapter title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} className="charon-input" />

        <div className="flex gap-2">
          {(["text", "images"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setContentType(t)}
              className={`text-utility rounded-full border px-4 py-1.5 transition-colors ${
                contentType === t
                  ? "border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_10%,transparent)] text-[var(--color-gold)]"
                  : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              {t === "text" ? "Text" : "Manga / images"}
            </button>
          ))}
        </div>

        {contentType === "text" ? (
          <ChapterEditor value={html} onChange={setHtml} onImportDocx={importDocx} onImportGDocs={importGDocs} />
        ) : (
          <PanelUpload value={panels} onChange={setPanels} folder="chapters" />
        )}

        <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <input type="checkbox" checked={earlyAccess} onChange={(e) => setEarlyAccess(e.target.checked)} />
          Early-access drop — pre-release subscribers are auto-charged & unlocked instantly
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Override price"
              value={override}
              onChange={(e) => setOverride(e.target.value)}
              className="charon-input pl-7 text-sm"
            />
          </div>
          <span className="text-xs text-[var(--color-muted)]">optional — leave blank to let the agent price it</span>
          <button disabled={busy} className="btn-coin ml-auto">
            {busy ? "Pricing…" : "Publish chapter"}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {result && (
        <div className="border border-[var(--color-gold)] bg-[var(--color-surface)] p-6">
          <div className="mb-2 inline-flex items-center gap-2 border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1 text-utility text-[var(--color-muted)]">
            <Sparkles size={12} className="text-[var(--color-gold)]" /> Pricing agent
          </div>
          <p className="text-sm text-[var(--color-muted)]">Priced this chapter at</p>
          <p className="font-display text-4xl font-bold text-coin">${result.price.toFixed(2)}</p>
          <p className="mt-2 text-sm">{result.reasoning}</p>
          {result.unlocks > 0 && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-[var(--color-accent-2)]">
              <Check size={14} /> Auto-paid & unlocked for {result.unlocks} pre-release subscriber{result.unlocks > 1 ? "s" : ""}.
            </p>
          )}
          <Link href={`/chapter/${result.chapterId}`} className="mt-4 inline-block text-utility text-[var(--color-gold)] hover:underline">
            Preview chapter →
          </Link>
        </div>
      )}
    </div>
  );
}
