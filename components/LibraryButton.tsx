"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookmarkPlus, BookmarkCheck, Loader2 } from "lucide-react";

/**
 * Explicit "Add to library" toggle. Reading a series no longer auto-adds it —
 * the reader chooses what lives in their library. Standard follow, removable.
 */
export function LibraryButton({ seriesId }: { seriesId: string }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("charon_user_id");
    setUserId(id);
    if (!id) {
      setReady(true);
      return;
    }
    fetch(`/api/follow?userId=${id}&seriesId=${seriesId}`)
      .then((r) => r.json())
      .then((d) => setMode(d.mode ?? null))
      .catch(() => {})
      .finally(() => setReady(true));
  }, [seriesId]);

  const inLibrary = mode != null;
  // A Series Pass / pre-release follow is managed elsewhere — don't let the
  // library toggle silently remove it.
  const locked = mode === "series_unlock" || mode === "pre_release";

  async function toggle() {
    if (!userId) {
      router.push("/join");
      return;
    }
    if (locked) return;
    setBusy(true);
    const next = inLibrary ? null : "standard";
    setMode(next); // optimistic
    try {
      await fetch("/api/follow", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, seriesId, mode: "standard" }),
      });
    } catch {
      setMode(inLibrary ? "standard" : null); // revert
    } finally {
      setBusy(false);
    }
  }

  const label = locked ? "In library" : inLibrary ? "In library" : "Add to library";

  return (
    <button
      onClick={toggle}
      disabled={busy || !ready || locked}
      aria-pressed={inLibrary}
      title={locked ? "Managed by your pass / pre-release" : undefined}
      className={`${inLibrary ? "btn-outline" : "btn-coin"} ${locked ? "cursor-default opacity-90" : ""}`}
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : inLibrary ? <BookmarkCheck size={15} /> : <BookmarkPlus size={15} />}
      {label}
    </button>
  );
}
