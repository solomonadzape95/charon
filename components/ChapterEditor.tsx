"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Quote, EyeOff, MessageSquare,
  Minus, AlignLeft, AlignCenter, Link2, Undo2, Redo2, Loader2, FileText, FileUp,
} from "lucide-react";
import { sanitizePastedContent } from "@/lib/sanitize-html";

/* ── Custom block wrappers — stored as <div data-type="…">; the reader and the
   cross-post formatter convert these to each platform's native syntax. ── */
const Spoiler = Node.create({
  name: "spoiler",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-type="spoiler"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "spoiler" }), 0];
  },
});

const AuthorNote = Node.create({
  name: "authorNote",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-type="author-note"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "author-note" }), 0];
  },
});

const WORDS_PER_MIN = 250;

export function ChapterEditor({
  value,
  onChange,
  onImportDocx,
  onImportGDocs,
}: {
  value: string;
  onChange: (html: string) => void;
  onImportDocx?: (file: File) => Promise<string>;
  onImportGDocs?: (url: string) => Promise<string>;
}) {
  const [words, setWords] = useState(0);
  const [importing, setImporting] = useState(false);
  const [gdocsOpen, setGdocsOpen] = useState(false);
  const [gdocsUrl, setGdocsUrl] = useState("");
  const txtRef = useRef<HTMLInputElement>(null);
  const docxRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ["paragraph"] }),
      Placeholder.configure({ placeholder: "Write or paste your chapter… (paste from Google Docs is auto-cleaned)" }),
      Spoiler,
      AuthorNote,
    ],
    content: value || "",
    editorProps: {
      // Clean Google Docs / Word HTML on paste before it enters the document.
      transformPastedHTML: (html) => sanitizePastedContent(html),
      attributes: { class: "charon-prose min-h-[18rem] focus:outline-none" },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      const t = editor.getText().trim();
      setWords(t ? t.split(/\s+/).length : 0);
    },
  });

  // Keep the editor in sync when the parent resets or replaces `value` (e.g. the
  // form clears itself after a successful publish). Without this the editor keeps
  // showing stale text while the parent state is empty — so the next "Publish"
  // either errors ("write some text") or silently republishes a duplicate.
  // We only setContent when the two genuinely differ, so typing never jumps.
  useEffect(() => {
    if (!editor) return;
    const incoming = value || "";
    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, { emitUpdate: false });
      const t = editor.getText().trim();
      setWords(t ? t.split(/\s+/).length : 0);
    }
  }, [value, editor]);

  if (!editor) {
    return <div className="grid h-72 place-items-center border border-[var(--color-border)] text-[var(--color-muted)]">Loading editor…</div>;
  }

  const readMin = Math.max(1, Math.round(words / WORDS_PER_MIN));

  async function loadHtml(html: string) {
    editor!.commands.setContent(html);
    onChange(editor!.getHTML());
    const t = editor!.getText().trim();
    setWords(t ? t.split(/\s+/).length : 0);
  }

  async function onTxt(file?: File | null) {
    if (!file) return;
    const text = await file.text();
    const html = text
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, "<br>").replace(/</g, "&lt;")}</p>`)
      .join("");
    await loadHtml(html);
  }

  async function onDocx(file?: File | null) {
    if (!file || !onImportDocx) return;
    setImporting(true);
    try {
      await loadHtml(await onImportDocx(file));
    } finally {
      setImporting(false);
    }
  }

  async function importGDocs() {
    if (!gdocsUrl || !onImportGDocs) return;
    setImporting(true);
    try {
      await loadHtml(await onImportGDocs(gdocsUrl));
      setGdocsOpen(false);
      setGdocsUrl("");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--color-border)] p-1.5">
        <Tb on={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><Bold size={15} /></Tb>
        <Tb on={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic size={15} /></Tb>
        <Tb on={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><UnderlineIcon size={15} /></Tb>
        <Tb on={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><Strikethrough size={15} /></Tb>
        <Sep />
        <Tb on={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote / status box"><Quote size={15} /></Tb>
        <Tb on={editor.isActive("spoiler")} onClick={() => editor.chain().focus().toggleWrap("spoiler").run()} title="Spoiler block"><EyeOff size={15} /></Tb>
        <Tb on={editor.isActive("authorNote")} onClick={() => editor.chain().focus().toggleWrap("authorNote").run()} title="Author note"><MessageSquare size={15} /></Tb>
        <Tb on={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Scene break"><Minus size={15} /></Tb>
        <Sep />
        <Tb on={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align left"><AlignLeft size={15} /></Tb>
        <Tb on={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Center"><AlignCenter size={15} /></Tb>
        <Sep />
        <Tb
          on={editor.isActive("link")}
          onClick={() => {
            const prev = editor.getAttributes("link").href as string | undefined;
            const url = window.prompt("Link URL", prev ?? "https://");
            if (url === null) return;
            if (url === "") editor.chain().focus().unsetLink().run();
            else editor.chain().focus().setLink({ href: url }).run();
          }}
          title="Link"
        >
          <Link2 size={15} />
        </Tb>
        <Sep />
        <Tb on={false} onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo2 size={15} /></Tb>
        <Tb on={false} onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo2 size={15} /></Tb>

        {/* Import */}
        <div className="ml-auto flex items-center gap-0.5">
          <button type="button" onClick={() => txtRef.current?.click()} className="text-utility flex items-center gap-1 px-2 py-1 text-[var(--color-muted)] hover:text-[var(--color-ink)]" title="Import .txt">
            <FileText size={14} /> .txt
          </button>
          {onImportDocx && (
            <button type="button" onClick={() => docxRef.current?.click()} className="text-utility flex items-center gap-1 px-2 py-1 text-[var(--color-muted)] hover:text-[var(--color-ink)]" title="Import .docx">
              <FileUp size={14} /> .docx
            </button>
          )}
          {onImportGDocs && (
            <button type="button" onClick={() => setGdocsOpen((o) => !o)} className="text-utility px-2 py-1 text-[var(--color-muted)] hover:text-[var(--color-ink)]" title="Import from Google Docs link">
              GDocs
            </button>
          )}
          {importing && <Loader2 size={14} className="animate-spin text-[var(--color-gold)]" />}
        </div>
        <input ref={txtRef} type="file" accept=".txt,text/plain" hidden onChange={(e) => { onTxt(e.target.files?.[0]); e.target.value = ""; }} />
        <input ref={docxRef} type="file" accept=".docx" hidden onChange={(e) => { onDocx(e.target.files?.[0]); e.target.value = ""; }} />
      </div>

      {gdocsOpen && (
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg)] p-2">
          <input
            value={gdocsUrl}
            onChange={(e) => setGdocsUrl(e.target.value)}
            placeholder="Public Google Docs link (Anyone with link can view)"
            className="charon-input text-sm"
          />
          <button type="button" onClick={importGDocs} disabled={importing} className="btn-outline shrink-0">Import</button>
        </div>
      )}

      {/* Editor surface */}
      <div className="px-4 py-4">
        <EditorContent editor={editor} />
      </div>

      {/* Footer — live counts */}
      <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-2 text-utility text-[var(--color-muted)]">
        <span>{words.toLocaleString()} words</span>
        <span>≈ {readMin} min read</span>
      </div>
    </div>
  );
}

function Tb({ on, onClick, title, children }: { on: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`grid h-8 w-8 place-items-center rounded transition-colors ${
        on ? "bg-[color-mix(in_srgb,var(--color-gold)_16%,transparent)] text-[var(--color-gold)]" : "text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 h-5 w-px bg-[var(--color-border)]" />;
}
