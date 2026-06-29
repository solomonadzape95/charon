"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone, Trash2, Plus } from "lucide-react";

interface Announcement {
  id: string;
  created_at: string;
  title: string | null;
  body: string;
  series_id: string | null;
}

/** Creator-side: post + manage announcements readers see on the series page. */
export function AnnouncementsManager({ creatorId, seriesId }: { creatorId: string; seriesId: string }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/announcements?seriesId=${seriesId}`)
      .then((r) => r.json())
      .then((d) => setItems(d.announcements ?? []))
      .catch(() => {});
  }, [seriesId]);

  useEffect(load, [load]);

  async function post() {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, seriesId, title: title.trim() || undefined, body: body.trim() }),
      });
      setTitle("");
      setBody("");
      setComposing(false);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this announcement?")) return;
    await fetch(`/api/announcements?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone size={18} className="text-[var(--color-gold)]" />
          <h2 className="font-display text-2xl font-semibold">Announcements</h2>
        </div>
        <button onClick={() => setComposing((c) => !c)} className="btn-outline !py-2 !text-[0.72rem]">
          <Plus size={13} /> New
        </button>
      </div>
      <p className="text-sm text-[var(--color-muted)]">Drop a note — readers see it at the top of your series page.</p>

      {composing && (
        <div className="space-y-3 border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <input
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="charon-input"
          />
          <textarea
            placeholder="What's the news? Schedule change, milestone, a thank-you…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="charon-input h-28 resize-none"
          />
          <div className="flex gap-2">
            <button disabled={busy || !body.trim()} onClick={post} className="btn-coin">
              {busy ? "Posting…" : "Post announcement"}
            </button>
            <button onClick={() => setComposing(false)} className="btn-outline">Cancel</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        !composing && <p className="text-sm text-[var(--color-muted)]">No announcements yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] border border-[var(--color-border)]">
          {items.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-4 bg-[var(--color-surface)] px-4 py-3">
              <div className="min-w-0">
                {a.title && <p className="font-medium">{a.title}</p>}
                <p className="whitespace-pre-wrap text-sm text-[var(--color-muted)]">{a.body}</p>
                <p className="text-utility mt-1 text-[var(--color-muted)]">
                  {new Date(a.created_at).toLocaleDateString()}
                  {a.series_id == null ? " · all series" : ""}
                </p>
              </div>
              <button onClick={() => remove(a.id)} title="Delete" className="shrink-0 text-[var(--color-muted)] hover:text-red-400">
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
