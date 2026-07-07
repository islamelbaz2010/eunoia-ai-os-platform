import type { KnowledgeLanguage } from "../types";

/**
 * Heuristic language detector. Uses Unicode character-set ratios.
 * No external library is invoked — suitable for offline / edge environments.
 *
 * Rules (applied to non-whitespace characters only):
 *   ≥50 % Arabic-script chars → "ar"
 *   ≥50 % Latin chars         → "en"
 *   both > 10 %               → "mixed"
 *   text < 10 non-space chars → "unknown"
 *   otherwise                 → "unknown"
 */
export function detectLanguage(text: string): KnowledgeLanguage {
  const cleaned = text.trim();
  if (!cleaned || cleaned.length < 10) return "unknown";

  // U+0600-06FF Arabic, U+0750-077F Arabic Supplement, U+08A0-08FF Arabic Extended-A
  const arabicChars = (cleaned.match(/[؀-ۿݐ-ݿࢠ-ࣿ]/g) ?? []).length;
  const latinChars = (cleaned.match(/[a-zA-Z]/g) ?? []).length;
  const meaningful = arabicChars + latinChars;

  // Not enough identifying characters to make a determination
  if (meaningful < 5) return "unknown";

  // Compare Arabic vs Latin directly so mixed-script text (equal proportions)
  // is not dominated by a single-script majority of the total character count.
  const arabicFraction = arabicChars / meaningful;

  if (arabicFraction >= 0.8) return "ar";
  if (arabicFraction <= 0.2) return "en";
  return "mixed";
}

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
