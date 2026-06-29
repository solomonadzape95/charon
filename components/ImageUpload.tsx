"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { uploadImage } from "@/lib/upload";

/* eslint-disable @next/next/no-img-element */

/** Single cover-image upload tile with preview. */
export function CoverUpload({
  value,
  onChange,
  folder = "covers",
  className = "",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function pick(file?: File | null) {
    if (!file) return;
    setErr("");
    setBusy(true);
    try {
      onChange(await uploadImage(file, folder));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="group relative block h-28 w-20 shrink-0 overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-2)] transition-colors hover:border-[var(--color-gold)]"
      >
        {value ? (
          <img src={value} alt="cover" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center text-[var(--color-muted)]">
            <ImagePlus size={20} strokeWidth={1.5} />
          </span>
        )}
        <span className="absolute inset-0 hidden place-items-center bg-black/55 text-utility text-white group-hover:grid">
          {busy ? <Loader2 size={16} className="animate-spin" /> : value ? "Change" : "Upload"}
        </span>
      </button>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      {err && <p className="mt-1 max-w-20 text-xs text-red-400">{err}</p>}
    </div>
  );
}

/** Multi-image (manga/manhwa panels) upload with an ordered thumbnail grid. */
export function PanelUpload({
  value,
  onChange,
  folder = "chapters",
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setErr("");
    setBusy(true);
    try {
      const urls = await Promise.all(Array.from(files).map((f) => uploadImage(f, folder)));
      onChange([...value, ...urls]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex w-full items-center justify-center gap-2 border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-6 text-sm text-[var(--color-muted)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-ink)]"
      >
        {busy ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Uploading…
          </>
        ) : (
          <>
            <ImagePlus size={16} /> Add panels (JPG / PNG — select multiple)
          </>
        )}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      {err && <p className="text-xs text-red-400">{err}</p>}
      {value.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {value.map((u, i) => (
            <div key={u} className="group relative aspect-[3/4] overflow-hidden border border-[var(--color-border)]">
              <img src={u} alt={`panel ${i + 1}`} className="h-full w-full object-cover" />
              <span className="tabular absolute left-1 top-1 bg-black/60 px-1 text-[10px] text-white">{i + 1}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                aria-label="Remove panel"
                className="absolute right-1 top-1 hidden rounded-full bg-black/70 p-0.5 text-white group-hover:block"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
