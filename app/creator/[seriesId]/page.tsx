"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, ArrowUp, ArrowDown, Pencil, Trash2, Ticket, Clock } from "lucide-react";
import { coverFor } from "@/lib/covers";
import { AccountNav } from "@/components/AccountNav";
import { getCreatorId, resolveCreatorId } from "@/lib/account";

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
  };
  chapters: Chapter[];
  preReleaseSubscribers: number;
  passBuyers: number;
}

export default function SeriesManagement({ params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", genre: "", status: "ongoing" as "ongoing" | "completed" });
  const [busy, setBusy] = useState(false);

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
        }
      })
      .catch(() => {});
  }, [seriesId]);

  useEffect(() => {
    (async () => {
      const id = getCreatorId() ?? (await resolveCreatorId());
      if (!id) {
        router.replace("/dashboard");
        return;
      }
      load();
    })();
  }, [load, router]);

  async function saveDetails() {
    setBusy(true);
    try {
      await fetch("/api/series", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: seriesId, ...form }),
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
      <>
        <AccountNav />
        <p className="mx-auto max-w-5xl px-6 py-12 text-[var(--color-muted)]">Loading…</p>
      </>
    );

  const { series, chapters } = data;
  const totalEarned = chapters.reduce((s, c) => s + c.earned, 0);
  const avgCompletion = chapters.length ? chapters.reduce((s, c) => s + c.completion, 0) / chapters.length : 0;
  const suggestedPass = Math.max(0.99, Math.round(chapters.reduce((s, c) => s + c.price, 0) * 0.7 * 100) / 100);
  const starters = chapters[0]?.reads ?? 0;
  const earlyAccessPrice = chapters.find((c) => c.earlyAccessPrice != null)?.earlyAccessPrice ?? 0.05;

  return (
    <>
      <AccountNav />
      <div className="mx-auto max-w-5xl space-y-10 px-6 py-10">
      <Link href="/dashboard" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
        ← Dashboard
      </Link>

      {/* Header / details editor */}
      <section className="flex flex-col gap-5 sm:flex-row">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverFor(series.id, series.cover_image)} alt="" className="h-44 w-32 shrink-0 self-start object-cover grayscale-[0.15]" />
        <div className="min-w-0 flex-1">
          {!editing ? (
            <>
              <div className="flex items-center gap-2 text-utility text-[var(--color-muted)]">
                {series.genre && <span className="bg-[var(--color-surface-2)] px-2 py-0.5">{series.genre}</span>}
                <span>{series.status}</span>
              </div>
              <h1 className="font-display display-md mt-2 font-semibold">{series.title}</h1>
              {series.description && <p className="mt-2 max-w-2xl text-[var(--color-muted)]">{series.description}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => setEditing(true)} className="btn-outline">
                  <Pencil size={14} /> Edit details
                </button>
                <Link href={`/creator/${series.id}/upload`} className="btn-coin">
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
                <input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} className="charon-input flex-1" placeholder="Genre" />
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "ongoing" | "completed" })} className="charon-input w-40">
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button disabled={busy} onClick={saveDetails} className="btn-coin">
                  {busy ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setEditing(false)} className="btn-outline">
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

      {/* Series Pass + Pre-release management */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center gap-2">
            <Ticket size={16} className="text-[var(--color-gold)]" />
            <h2 className="font-display text-lg font-semibold">Series Pass</h2>
          </div>
          <p className="text-sm text-[var(--color-muted)]">One price, permanent access — including future chapters.</p>
          <div className="flex items-end justify-between border-t border-[var(--color-border)] pt-3">
            <div>
              <p className="text-utility text-[var(--color-muted)]">Agent 2 suggests</p>
              <p className="font-display text-2xl font-bold text-coin">${suggestedPass.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-utility text-[var(--color-muted)]">Passes sold</p>
              <p className="tabular text-2xl font-semibold">{data.passBuyers}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[var(--color-gold)]" />
            <h2 className="font-display text-lg font-semibold">Pre-release</h2>
          </div>
          <p className="text-sm text-[var(--color-muted)]">Subscribers are auto-charged the moment a new chapter drops.</p>
          <div className="flex items-end justify-between border-t border-[var(--color-border)] pt-3">
            <div>
              <p className="text-utility text-[var(--color-muted)]">Early-access price</p>
              <p className="font-display text-2xl font-bold text-coin">${earlyAccessPrice.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-utility text-[var(--color-muted)]">Subscribers</p>
              <p className="tabular text-2xl font-semibold">{data.preReleaseSubscribers}</p>
            </div>
          </div>
        </div>
      </section>

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
          <Link href={`/creator/${series.id}/upload`} className="text-utility text-[var(--color-gold)]">
            + Upload
          </Link>
        </div>

        {chapters.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No chapters yet.</p>
        ) : (
          <div className="overflow-x-auto scrollbar-thin border border-[var(--color-border)]">
            <table className="w-full min-w-[46rem] border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--color-surface-2)] text-left text-utility text-[var(--color-muted)]">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Reads</th>
                  <th className="px-4 py-3 font-medium">Completion</th>
                  <th className="px-4 py-3 font-medium">Re-read</th>
                  <th className="px-4 py-3 text-right font-medium">Earned</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {chapters.map((c) => (
                  <tr key={c.id} className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
                    <td className="px-4 py-3 text-[var(--color-muted)]">{String(c.n).padStart(2, "0")}</td>
                    <td className="max-w-[14rem] truncate px-4 py-3 font-medium">{c.title}</td>
                    <td className="px-4 py-3">
                      <span className="tabular inline-flex items-center gap-1 text-[var(--color-gold)]">
                        ${c.price.toFixed(2)}
                        {c.moved === "up" && <ArrowUp size={12} className="text-[var(--color-accent-2)]" />}
                        {c.moved === "down" && <ArrowDown size={12} className="text-red-400" />}
                      </span>
                    </td>
                    <td className="tabular px-4 py-3 text-[var(--color-muted)]">{c.reads}</td>
                    <td className="px-4 py-3">
                      <MiniBar value={c.completion} />
                    </td>
                    <td className="tabular px-4 py-3 text-[var(--color-muted)]">{Math.round(c.reread * 100)}%</td>
                    <td className="tabular px-4 py-3 text-right font-semibold text-[var(--color-gold)]">${c.earned.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3 text-[var(--color-muted)]">
                        <Link href={`/chapter/${c.id}`} className="hover:text-[var(--color-ink)]" title="View / edit">
                          <Pencil size={14} />
                        </Link>
                        <button onClick={() => deleteChapter(c.id)} className="hover:text-red-400" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-[var(--color-muted)]">
          Prices are set live by the repricing agent within a floor and a ±20%/day cap. Override a price when you upload a
          chapter.
        </p>
      </section>
      </div>
    </>
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

function MiniBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 bg-[var(--color-surface-2)]">
        <div className="h-full bg-[var(--color-gold)]" style={{ width: `${Math.min(100, value * 100)}%` }} />
      </div>
      <span className="tabular text-xs text-[var(--color-muted)]">{Math.round(value * 100)}%</span>
    </div>
  );
}
