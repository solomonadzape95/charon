import DOMPurify from "isomorphic-dompurify";

/**
 * Charon's allowed HTML subset for chapter content. Runs both client-side (paste
 * cleaning) and server-side (.docx / Google Docs import). Everything outside this
 * set — inline styles, fonts, colours, classes from Google Docs/Word — is dropped.
 */
const ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "s", "a", "blockquote", "hr", "div"];
const ALLOWED_ATTR = ["href", "target", "rel", "data-type", "style"];

export function sanitizeHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
  // Keep only our own data-type wrappers + text-align; strip everything else.
  return clean
    .replace(/<div(?![^>]*data-type="(?:spoiler|author-note)")[^>]*>/gi, "<p>")
    .replace(/style="(?:[^"]*?)(text-align:\s*(left|center|right))?[^"]*?"/gi, (_m, _g, align) =>
      align ? `style="text-align:${align}"` : "",
    );
}

/**
 * Clean pasted HTML (Google Docs / Word) into the allowed subset:
 * headings → bold paragraphs, list items → paragraphs, no styles/fonts/colours.
 */
export function sanitizePastedContent(html: string): string {
  const normalized = html
    .replace(/<h[1-6][^>]*>/gi, "<p><strong>")
    .replace(/<\/h[1-6]>/gi, "</strong></p>")
    .replace(/<li[^>]*>/gi, "<p>")
    .replace(/<\/li>/gi, "</p>")
    .replace(/<\/?(?:ul|ol)[^>]*>/gi, "")
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, "</p><p>");
  return sanitizeHtml(normalized);
}

/** Heuristic: does this content look like editor HTML vs. legacy plain text? */
export function isHtmlContent(s: string): boolean {
  return /^\s*<(p|div|blockquote|hr|strong|em)\b/i.test(s) || /<\/p>/i.test(s);
}
