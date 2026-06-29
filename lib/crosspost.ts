/**
 * Cross-post formatters. Turn a Charon chapter's stored HTML into the exact
 * format each destination platform wants, per charon-editor-crosspost.md.
 * Pure string transforms — safe on client and server.
 */
export type Platform = "royalroad" | "scribblehub" | "wattpad" | "webnovel";

export interface PlatformMeta {
  id: Platform;
  name: string;
  blurb: string;
  /** clipboard mime — HTML platforms get rich paste, text platforms plain */
  mime: "text/html" | "text/plain";
}

export const PLATFORMS: PlatformMeta[] = [
  { id: "royalroad", name: "Royal Road", blurb: "Clean HTML — bold, italic, blockquotes preserved.", mime: "text/html" },
  { id: "scribblehub", name: "ScribbleHub", blurb: "HTML + ScribbleHub tags for spoilers & author notes.", mime: "text/html" },
  { id: "wattpad", name: "Wattpad", blurb: "Plain text with line breaks; formatting flattened.", mime: "text/plain" },
  { id: "webnovel", name: "WebNovel", blurb: "Minimal plain text in the [bracket] / *** conventions.", mime: "text/plain" },
];

const SCENE = "―――――――――――";

function decode(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"');
}

/** Inner fragment → plain text, paragraphs/brs as newlines. */
function blockText(frag: string): string {
  return decode(
    frag
      .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  ).trim();
}

/** Pull author-note blocks out of the body; return the rest + the note texts. */
function extractAuthorNotes(html: string): { body: string; notes: string[] } {
  const notes: string[] = [];
  const body = html.replace(/<div data-type="author-note">([\s\S]*?)<\/div>/gi, (_m, inner) => {
    const t = blockText(inner);
    if (t) notes.push(t);
    return "";
  });
  return { body, notes };
}

/** Whole-document → plain text with the given scene-break + block conventions. */
function toPlainText(
  html: string,
  opts: { sceneBreak: string; blockquote: (t: string) => string; spoiler: (t: string) => string },
): string {
  let s = html;
  s = s.replace(/<div data-type="spoiler">([\s\S]*?)<\/div>/gi, (_m, inner) => `\n${opts.spoiler(blockText(inner))}\n`);
  s = s.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (_m, inner) => `\n${opts.blockquote(blockText(inner))}\n`);
  s = s.replace(/<hr\s*\/?>/gi, `\n${opts.sceneBreak}\n`);
  s = s.replace(/<\/p>/gi, "\n\n").replace(/<p[^>]*>/gi, "");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = decode(s.replace(/<[^>]+>/g, "")); // strip remaining inline tags (bold/italic don't survive)
  return s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export interface FormattedPost {
  content: string;
  /** for platforms with a separate author-note field */
  authorNote?: string;
  mime: "text/html" | "text/plain";
}

export function formatForPlatform(html: string, platform: Platform): FormattedPost {
  switch (platform) {
    case "royalroad": {
      // Clean HTML; author notes go in RR's separate field, not the body.
      const { body, notes } = extractAuthorNotes(html);
      const content = body
        .replace(/<div data-type="spoiler">([\s\S]*?)<\/div>/gi, "<details><summary>Spoiler</summary>$1</details>")
        .replace(/\sstyle="text-align:(left|center|right)"/gi, "")
        .replace(/<p>\s*<\/p>/gi, "")
        .trim();
      return { content, authorNote: notes.join("\n\n") || undefined, mime: "text/html" };
    }
    case "scribblehub": {
      // HTML body + ScribbleHub's native tag syntax.
      const content = html
        .replace(/<div data-type="spoiler">([\s\S]*?)<\/div>/gi, "[spoiler]$1[/spoiler]")
        .replace(/<div data-type="author-note">([\s\S]*?)<\/div>/gi, "[author_note]$1[/author_note]")
        .replace(/<hr\s*\/?>/gi, "[hr]")
        .replace(/\sstyle="text-align:(left|center|right)"/gi, "")
        .trim();
      return { content, mime: "text/html" };
    }
    case "wattpad": {
      const { body, notes } = extractAuthorNotes(html);
      let content = toPlainText(body, {
        sceneBreak: SCENE,
        blockquote: (t) => `${SCENE}\n${t}\n${SCENE}`,
        spoiler: (t) => `⚠ Spoiler: ${t}`,
      });
      if (notes.length) content += `\n\n[Author's Note: ${notes.join(" ")}]`;
      return { content, mime: "text/plain" };
    }
    case "webnovel": {
      // Author notes go in WebNovel's separate field — keep them out of the body.
      const { body, notes } = extractAuthorNotes(html);
      const content = toPlainText(body, {
        sceneBreak: "***",
        blockquote: (t) => `[${t.replace(/\n+/g, " | ")}]`,
        spoiler: (t) => `(Spoiler ahead) ${t}`,
      });
      return { content, authorNote: notes.join("\n\n") || undefined, mime: "text/plain" };
    }
  }
}
