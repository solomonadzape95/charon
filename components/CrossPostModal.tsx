"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { CrossPostPanel } from "@/components/CrossPostPanel";

/**
 * Modal wrapper around the cross-post panel. Launched from the editor result and
 * from any chapter row in series management.
 */
export function CrossPostModal({
  chapterId,
  html,
  chapterLabel,
  onClose,
}: {
  chapterId: string;
  html: string;
  chapterLabel?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className="fade-up relative w-full max-w-3xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-utility text-[var(--color-gold)]">Cross-post</p>
            {chapterLabel && <p className="font-display text-lg font-semibold text-[var(--color-ink)]">{chapterLabel}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-ink)]"
          >
            <X size={16} />
          </button>
        </div>
        <CrossPostPanel chapterId={chapterId} html={html} />
      </div>
    </div>
  );
}
