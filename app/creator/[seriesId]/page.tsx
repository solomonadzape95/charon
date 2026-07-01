"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, ArrowUp, ArrowDown, Pencil, Trash2, Ticket, Clock, Share2, Check, Eye } from "lucide-react";
import { coverFor } from "@/lib/covers";
import { Breadcrumb } from "@/components/Breadcrumb";
import EmptyState from "@/components/EmptyState";
import { CrossPostModal } from "@/components/CrossPostModal";
import { AnnouncementsManager } from "@/components/AnnouncementsManager";
import { CoverUpload } from "@/components/ImageUpload";
import { SkeletonBlock, StatGridSkeleton } from "@/components/Skeletons";
import { getCreatorId, resolveCreatorId } from "@/lib/account";
import { setMode } from "@/lib/mode";

interface Chapter {
  id: string;
  n: number;
  title: string;
  price: number;
  basePrice: number;
  floor: number;
  earlyAccessPrice: number | null;
  moved: "up" | "down" | null;
  reads: number;
  completion: number;
  reread: number;
  earned: number;
  contentType: "text" | "images";
  html: string;
}
interface Data {
  series: {
    id: string;
    slug: string | null;
    title: string;
    description: string | null;
    genre: string | null;
    status: "ongoing" | "completed";
    cover_image: string | null;
    follower_count: number;
    passPrice: number | null;
    preReleasePrice: number | null;
  };
  chapters: Chapter[];
  suggestedPassPrice: number;
  suggestedPreReleasePrice: number;
  preReleaseSubscribers: number;
  passBuyers: number;
}

export default function SeriesManagement({ params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", genre: "", status: "ongoing" as "ongoing" | "completed" });
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [crosspost, setCrosspost] = useState<{ id: string; html: string; label: string } | null>(null);

  const load = useCallback(() => {
    fetch(`/api/creator/series/${seriesId}`)
      .then((r) => r.json())
      .then((d: Data) => {
        if (d.series) {
          setData(d);
          setForm({
            title: d.series.title,
            description: d.series.description ?? "",
            genre: d.series.genre ?? "",
            status: d.series.status,
          });
          setCoverUrl(d.series.cover_image);
        }
      })
      .catch(() => {});
  }, [seriesId]);

  useEffect(() => {
    setMode("studio");
    (async () => {
      const id = getCreatorId() ?? (await resolveCreatorId());
      if (!id) {
        router.replace("/dashboard");
        return;
      }
      setCreatorId(id);
      load();
    })();
  }, [load, router]);

  async function savePricing(patch: { passPrice?: number | null; preReleasePrice?: number | null }) {
    await fetch("/api/series", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: seriesId, ...patch }),
    });
    load();
  }

  async function saveDetails() {
    setBusy(true);
    try {
      await fetch("/api/series", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: seriesId, ...form, coverImage: coverUrl ?? "" }),
      });
      setEditing(false);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function deleteChapter(id: string) {
    if (!confirm("Delete this chapter? This can't be undone.")) return;
    const res = await fetch(`/api/chapters?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "Could not delete.");
      return;
    }
    load();
  }

  if (!data)
    return (
      <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <SkeletonBlock className="h-4 w-24" />
        <div className="flex flex-col gap-5 sm:flex-row">
          <SkeletonBlock className="h-44 w-32 shrink-0" />
          <div className="flex-1 space-y-3 py-1">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-9 w-2/3" />
            <SkeletonBlock className="h-3 w-full max-w-md" />
          </div>
        </div>
        <StatGridSkeleton count={4} />
        <SkeletonBlock className="h-40 w-full" />
      </div>
    );

  const { series, chapters } = data;
  const totalEarned = chapters.reduce((s, c) => s + c.earned, 0);
  const avgCompletion = chapters.length ? chapters.reduce((s, c) => s + c.completion, 0) / chapters.length : 0;
  const starters = chapters[0]?.reads ?? 0;
  const genreTags = (series.genre ?? "").split(",").map((g) => g.trim()).filter(Boolean);

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-10 px-6 py-10">
      <Breadcrumb items={[{ label: "Studio", href: "/creator/studio" }, { label: series.title }]} />

      {/* Header / details editor */}
      <section className="flex flex-col gap-5 sm:flex-row">
        {!editing ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverFor(series.id, series.cover_image)} alt="" className="h-44 w-32 shrink-0 self-start object-cover grayscale-[0.15]" />
        ) : (
          <div className="shrink-0">
            <CoverUpload value={coverUrl} onChange={setCoverUrl} folder="covers" />
            <p className="mt-2 w-32 text-center text-[11px] text-[var(--color-muted)]">Tap to change cover</p>
          </div>
        )}
        <div className="min-w-0 flex-1">
          {!editing ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-utility text-[var(--color-muted)]">
                {genreTags.map((g) => (
                  <span key={g} className="bg-[var(--color-surface-2)] px-2 py-0.5">{g}</span>
                ))}
                <span>{series.status}</span>
              </div>
              <h1 className="font-display display-md mt-2 font-semibold">{series.title}</h1>
              {series.description && <p className="mt-2 max-w-2xl text-[var(--color-muted)]">{series.description}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => setEditing(true)} className="btn-outline">
                  <Pencil size={14} /> Edit details
                </button>
                <Link href={`/creator/${series.slug ?? series.id}/upload`} className="btn-coin">
                  <Upload size={14} /> Upload chapter
                </Link>
                <Link href={`/series/${series.slug ?? series.id}`} className="btn-outline">
                  View public page
                </Link>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="charon-input" placeholder="Title" />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="charon-input h-24 resize-none" placeholder="Description" />
              <div className="flex flex-wrap gap-3">
                <input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} className="charon-input flex-1" placeholder="Genres, comma separated (fantasy, litrpg, system)" />
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "ongoing" | "completed" })} className="charon-input w-40">
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              {form.genre.trim() && (
                <div className="flex flex-wrap gap-1.5">
                  {form.genre.split(",").map((g) => g.trim()).filter(Boolean).map((g) => (
                    <span key={g} className="text-utility border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-0.5 text-[var(--color-muted)]">
                      #{g}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button disabled={busy} onClick={saveDetails} className="btn-coin">
                  {busy ? "Saving…" : "Save"}
                </button>
                <button onClick={() => { setEditing(false); setCoverUrl(series.cover_image); }} className="btn-outline">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-2 gap-px border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-4">
        <Stat label="Readers" value={`${series.follower_count}`} />
        <Stat label="Chapters" value={`${chapters.length}`} />
        <Stat label="Earned" value={`$${totalEarned.toFixed(2)}`} accent />
        <Stat label="Avg completion" value={`${Math.round(avgCompletion * 100)}%`} />
      </section>

      {/* Series Pass + Pre-release management — creator-set, persisted */}
      <section className="grid gap-4 md:grid-cols-2">
        <OfferCard
          icon={Ticket}
          title="Series Pass"
          blurb="One payment for permanent access to every current and future chapter. Priced at 85% of the full per-chapter cost."
          price={series.passPrice}
          suggested={data.suggestedPassPrice}
          countLabel="Passes sold"
          count={data.passBuyers}
          onSave={(v) => savePricing({ passPrice: v })}
        />
        <OfferCard
          icon={Clock}
          title="Pre-release"
          blurb="One early-access price for the whole series. Subscribers are auto-charged the moment a new chapter drops."
          price={series.preReleasePrice}
          suggested={data.suggestedPreReleasePrice}
          countLabel="Subscribers"
          count={data.preReleaseSubscribers}
          onSave={(v) => savePricing({ preReleasePrice: v })}
        />
      </section>

      {/* Announcements */}
      {creatorId && <AnnouncementsManager creatorId={creatorId} seriesId={series.id} />}

      {/* Reader retention */}
      {chapters.length > 0 && starters > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-2xl font-semibold">Reader retention</h2>
          <p className="text-sm text-[var(--color-muted)]">
            Share of readers who started the series and are still reading at each chapter.
          </p>
          <div className="flex items-end gap-1.5 border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            {chapters.map((c) => {
              const pct = Math.min(1, c.reads / starters);
              return (
                <div key={c.id} className="group flex flex-1 flex-col items-center gap-2" title={`Ch ${c.n}: ${Math.round(pct * 100)}%`}>
                  <div className="flex h-32 w-full items-end">
                    <div className="w-full bg-[var(--color-gold)] transition-all group-hover:bg-[var(--color-gold-soft)]" style={{ height: `${Math.max(3, pct * 100)}%` }} />
                  </div>
                  <span className="text-utility text-[var(--color-muted)]">{c.n}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Chapter list */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Chapters</h2>
          <Link href={`/creator/${series.slug ?? series.id}/upload`} className="btn-outline !py-2 !text-[0.72rem]">
            <Upload size={13} /> Upload
          </Link>
        </div>

        {chapters.length === 0 ? (
          <EmptyState
            title="No chapters yet"
            description="Publish your first chapter to start building this series."
            actionHref={`/creator/${series.slug ?? series.id}/upload`}
            actionLabel="Add a chapter"
          />
        ) : (
          <div className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
            {chapters.map((c) => (
              <div key={c.id} className="flex flex-col gap-4 bg-[var(--color-surface)] p-5 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <span className="font-display text-2xl font-bold text-[var(--color-muted)]">{String(c.n).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    <h3 className="font-display truncate text-lg font-semibold">{c.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--color-muted)]">
                      <span className="tabular inline-flex items-center gap-1 font-semibold text-[var(--color-gold)]">
                        ${c.price.toFixed(2)}
                        {c.moved === "up" && <ArrowUp size={13} className="text-[var(--color-accent-2)]" />}
                        {c.moved === "down" && <ArrowDown size={13} className="text-red-400" />}
                      </span>
                      <span className="tabular">{c.reads} reads</span>
                      <span className="tabular">{Math.round(c.completion * 100)}% finish</span>
                      <span className="tabular">{Math.round(c.reread * 100)}% re-read</span>
                      <span className="tabular font-semibold text-[var(--color-gold)]">${c.earned.toFixed(2)} earned</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href={`/creator/${series.slug ?? series.id}/edit/${c.id}`} className="btn-outline !py-2 !text-[0.7rem]">
                    <Pencil size={13} /> Edit
                  </Link>
                  <Link
                    href={`/chapter/${c.id}`}
                    title="Author preview (free)"
                    className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-muted)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-ink)]"
                  >
                    <Eye size={15} />
                  </Link>
                  {c.contentType === "text" && (
                    <button
                      onClick={() => setCrosspost({ id: c.id, html: c.html, label: `Ch ${c.n} · ${c.title}` })}
                      title="Cross-post this chapter"
                      className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-muted)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-gold)]"
                    >
                      <Share2 size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteChapter(c.id)}
                    title="Delete"
                    className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-border)] text-[var(--color-muted)] transition-colors hover:border-red-400 hover:text-red-400"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-[var(--color-muted)]">
          An agent updates prices automatically. It stays above a set minimum and never changes a price by more than 20% in
          a day. You can set your own price when you upload a chapter.
        </p>
      </section>
      </div>

      {crosspost && (
        <CrossPostModal
          chapterId={crosspost.id}
          html={crosspost.html}
          chapterLabel={crosspost.label}
          onClose={() => setCrosspost(null)}
        />
      )}
    </>
  );
}

/** Editable Series Pass / Pre-release offer card — persists on save, clears on remove. */
function OfferCard({
  icon: Icon,
  title,
  blurb,
  price,
  suggested,
  countLabel,
  count,
  onSave,
}: {
  icon: typeof Ticket;
  title: string;
  blurb: string;
  price: number | null;
  suggested: number;
  countLabel: string;
  count: number;
  onSave: (price: number | null) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  function startEdit() {
    setValue((price ?? suggested).toFixed(2));
    setEditing(true);
  }
  async function save(next: number | null) {
    setBusy(true);
    try {
      await onSave(next);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-[var(--color-gold)]" />
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {price != null ? (
          <span className="text-utility ml-auto inline-flex items-center gap-1 text-[var(--color-accent-2)]">
            <Check size={12} /> Live
          </span>
        ) : (
          <span className="text-utility ml-auto text-[var(--color-muted)]">Not offered</span>
        )}
      </div>
      <p className="text-sm text-[var(--color-muted)]">{blurb}</p>

      {!editing ? (
        <>
          <div className="flex items-end justify-between border-t border-[var(--color-border)] pt-3">
            <div>
              <p className="text-utility text-[var(--color-muted)]">{price != null ? "Your price" : "Suggested price"}</p>
              <p className="font-display text-2xl font-bold text-coin">${(price ?? suggested).toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-utility text-[var(--color-muted)]">{countLabel}</p>
              <p className="tabular text-2xl font-semibold">{count}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={startEdit} className="btn-outline !py-2 !text-[0.72rem]">
              {price != null ? "Edit price" : "Set price"}
            </button>
            {price != null && (
              <button onClick={() => save(null)} disabled={busy} className="text-utility px-2 text-[var(--color-muted)] hover:text-red-400">
                Stop offering
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3">
          <div className="relative w-32">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="charon-input pl-7 text-sm"
              autoFocus
            />
          </div>
          <button onClick={() => save(Number(value))} disabled={busy || !(Number(value) > 0)} className="btn-coin !py-2 !text-[0.72rem]">
            {busy ? "Saving…" : "Save"}
          </button>
          <button onClick={() => setEditing(false)} className="btn-outline !py-2 !text-[0.72rem]">
            Cancel
          </button>
          <span className="text-utility w-full text-[var(--color-muted)]">Suggested ${suggested.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-[var(--color-surface)] px-5 py-5">
      <p className="text-utility text-[var(--color-muted)]">{label}</p>
      <p className={`tabular mt-1 text-2xl font-semibold ${accent ? "text-[var(--color-gold)]" : ""}`}>{value}</p>
    </div>
  );
}

