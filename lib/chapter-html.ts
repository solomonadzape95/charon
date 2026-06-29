/**
 * Pure (no-DOMPurify) transforms for rendering chapter HTML to readers.
 * Safe to import in client components — keeps the heavy sanitizer off the reader.
 */

/** Does this content look like editor HTML vs. legacy plain text? */
export function isHtmlContent(s: string): boolean {
  return /^\s*<(p|div|blockquote|hr|strong|em)\b/i.test(s) || /<\/p>/i.test(s);
}

/**
 * Convert stored editor HTML to reader markup: spoiler wrappers become
 * click-to-reveal <details>, author notes become labelled asides.
 */
export function toReaderHtml(html: string): string {
  return html
    .replace(
      /<div data-type="spoiler">([\s\S]*?)<\/div>/gi,
      '<details class="charon-spoiler"><summary>Spoiler — tap to reveal</summary>$1</details>',
    )
    .replace(
      /<div data-type="author-note">([\s\S]*?)<\/div>/gi,
      '<aside class="charon-author-note"><span class="charon-an-label">Author’s note</span>$1</aside>',
    );
}
