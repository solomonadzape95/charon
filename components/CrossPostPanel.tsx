"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Check, Circle, CheckCircle2 } from "lucide-react";
import { PLATFORMS, formatForPlatform, type Platform } from "@/lib/crosspost";

interface Status {
  platform: string;
  posted: boolean;
  external_url: string | null;
}

export function CrossPostPanel({ chapterId, html }: { chapterId: string; html: string }) {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/crosspost?chapterId=${chapterId}`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, Status> = {};
        for (const s of (d.statuses ?? []) as Status[]) map[s.platform] = s;
        setStatuses(map);
      })
      .catch(() => {});
  }, [chapterId]);

  useEffect(load, [load]);

  async function copy(platform: Platform) {
    const { content, mime } = formatForPlatform(html, platform);
    try {
      if (mime === "text/html" && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([content], { type: "text/html" }),
            "text/plain": new Blob([content], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(content);
      }
      setCopied(platform);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  async function setPosted(platform: string, posted: boolean) {
    setStatuses((s) => ({ ...s, [platform]: { ...(s[platform] ?? { platform, external_url: null }), posted } }));
    await fetch("/api/crosspost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId, platform, posted }),
    });
  }

  return (
    <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <h2 className="font-display text-xl font-semibold">Cross-post this chapter</h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Copy a platform-ready version and paste it into each site. Charon never logs in for you. You stay in control.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {PLATFORMS.map((p) => {
          const st = statuses[p.id];
          const posted = !!st?.posted;
          const note = formatForPlatform(html, p.id).authorNote;
          return (
            <div key={p.id} className="flex flex-col gap-3 border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-base font-semibold">{p.name}</p>
                  <span className="text-utility text-[var(--color-muted)]">{p.mime === "text/html" ? "HTML" : "Plain text"}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">{p.blurb}</p>
              </div>

              <div className="mt-auto flex items-center gap-2">
                <button onClick={() => copy(p.id)} className="btn-outline flex-1 !py-2 !text-[0.72rem]">
                  {copied === p.id ? (
                    <>
                      <Check size={14} /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy
                    </>
                  )}
                </button>
                <button
                  onClick={() => setPosted(p.id, !posted)}
                  className={`inline-flex items-center gap-1.5 px-2 py-2 text-utility transition-colors ${
                    posted ? "text-[var(--color-accent-2)]" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  }`}
                  title={posted ? "Mark as not posted" : "Mark as posted"}
                >
                  {posted ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                  {posted ? "Posted" : "Not posted"}
                </button>
              </div>

              {note && (
                <p className="border-t border-[var(--color-border)] pt-2 text-[11px] leading-relaxed text-[var(--color-muted)]">
                  Author note goes in {p.name}&apos;s separate field. The copy includes the body only.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
