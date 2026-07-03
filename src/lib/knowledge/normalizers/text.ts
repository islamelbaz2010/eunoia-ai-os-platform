/**
 * Normalizes text to NFC, collapses internal whitespace, and trims.
 * Safe to call on any input including empty string.
 */
export function normalizeWhitespace(text: string): string {
  return text
    .normalize("NFC")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/ /g, " ") // non-breaking space → regular space
    .replace(/ /g, " ") // em space → regular space
    .replace(/​/g, "")  // zero-width space → removed
    .replace(/ {2,}/g, " ")
    .trim();
}

/**
 * Produces a lowercase, punctuation-stripped form of text for comparison.
 * Two strings that produce the same output are considered equivalent.
 */
export function normalizeForComparison(text: string): string {
  return normalizeWhitespace(text)
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/ {2,}/g, " ")
    .trim();
}

/**
 * Strips HTML tags and decodes common HTML entities.
 * Does not sanitize — use only for text extraction.
 */
export function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
}

/**
 * Truncates text to at most maxLength characters, breaking on the last word
 * boundary. Appends an ellipsis character when truncation occurs.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(" ");
  const cutAt = lastSpace > maxLength * 0.8 ? lastSpace : maxLength;
  return sliced.slice(0, cutAt) + "…";
}
