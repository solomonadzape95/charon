"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Eye, Share2 } from "lucide-react";
import { ChapterEditor } from "@/components/ChapterEditor";
import { PanelUpload } from "@/components/ImageUpload";
import { CrossPostModal } from "@/components/CrossPostModal";
import { Breadcrumb } from "@/components/Breadcrumb";
import { SkeletonBlock } from "@/components/Skeletons";
import { setMode } from "@/lib/mode";

interface Chapter {
  id: string;
  series_id: string;
  chapter_number: number;
  title: string | null;
  content_type: "text" | "images";
  content: string | null;
}

export default function EditChapterPage({ params }: { params: Promise<{ seriesId: string; chapterId: string }> }) {
  const { seriesId, chapterId } = use(params);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [title, setTitle] = useState("");
  const [html, setHtml] = useState("");
  const [panels, setPanels] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showCrosspost, setShowCrosspost] = useState(false);

  useEffect(() => {
    setMode("studio");
    fetch(`/api/chapters?id=${chapterId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.chapter) {
          setError("Chapter not found.");
          return;
        }
        const c = d.chapter as Chapter;
        setChapter(c);
        setTitle(c.title ?? "");
        if (c.content_type === "images") {
          try {
            const arr = JSON.parse(c.content ?? "[]");
            setPanels(Array.isArray(arr) ? arr : []);
          } catch {
            setPanels([]);
          }
        } else {
          setHtml(c.content ?? "");
        }
      })
      .catch(() => setError("Could not load this chapter."));
  }, [chapterId]);

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

  async function save() {
    if (!chapter) return;
    setError("");
    const content = chapter.content_type === "images" ? JSON.stringify(panels) : html;
    if (chapter.content_type === "images" && panels.length === 0) {
      setError("Add at least one panel image.");
      return;
    }
    if (chapter.content_type === "text" && !html.replace(/<[^>]+>/g, "").trim()) {
      setError("Chapter content can't be empty.");
      return;
    }
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch("/api/chapters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: chapter.id, title: title || null, content }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Save failed.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setBusy(false);
    }
  }

  if (error && !chapter) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-[var(--color-muted)]">{error}</p>
        <Link href={`/creator/${seriesId}`} className="btn-outline mt-4">Back to series</Link>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-6 py-12">
        <SkeletonBlock className="h-3 w-40" />
        <SkeletonBlock className="h-9 w-2/3" />
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div>
        <Breadcrumb
          items={[
            { label: "Studio", href: "/creator/studio" },
            { label: "Series", href: `/creator/${seriesId}` },
            { label: `Chapter ${chapter.chapter_number}` },
          ]}
        />
        <h1 className="font-display display-md mt-2 font-semibold">Edit chapter</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">Changes save in place. The repricing agent keeps the price within its floor and cap.</p>
      </div>

      <input
        placeholder="Chapter title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="charon-input"
      />

      {chapter.content_type === "text" ? (
        <ChapterEditor value={html} onChange={setHtml} onImportDocx={importDocx} onImportGDocs={importGDocs} />
      ) : (
        <PanelUpload value={panels} onChange={setPanels} folder="chapters" />
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={busy} onClick={save} className="btn-coin">
          {busy ? "Saving…" : saved ? "Saved" : "Save changes"}
          {saved && <Check size={15} />}
        </button>
        <Link href={`/chapter/${chapter.id}`} className="btn-outline">
          <Eye size={14} /> Preview
        </Link>
        {chapter.content_type === "text" && (
          <button onClick={() => setShowCrosspost(true)} className="btn-outline">
            <Share2 size={14} /> Cross-post
          </button>
        )}
        <Link href={`/creator/${seriesId}`} className="ml-auto text-utility text-[var(--color-muted)] hover:text-[var(--color-ink)]">
          Done
        </Link>
      </div>

      {showCrosspost && (
        <CrossPostModal
          chapterId={chapter.id}
          html={html}
          chapterLabel={`Chapter ${chapter.chapter_number}`}
          onClose={() => setShowCrosspost(false)}
        />
      )}
    </div>
  );
}
