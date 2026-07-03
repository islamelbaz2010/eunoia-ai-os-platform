import type { KnowledgeKeywords } from "../types";

// ─── Stop words ───────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "with", "by", "from", "as", "is", "was", "are", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
  "may", "might", "shall", "can", "am", "need", "dare", "ought",
  "this", "that", "these", "those", "i", "you", "he", "she", "it", "we", "they",
  "me", "him", "her", "us", "them", "my", "your", "his", "its", "our", "their",
  "what", "which", "who", "whom", "whose", "when", "where", "why", "how",
  "all", "any", "both", "each", "few", "more", "most", "other", "some", "such",
  "no", "not", "only", "same", "so", "than", "too", "very", "just", "about",
  "above", "after", "before", "between", "during", "into", "through", "under",
  "up", "out", "off", "over", "then", "once", "here", "there", "also", "back",
  "even", "still", "well", "new", "old", "way", "use", "used", "using", "make",
  "take", "get", "got", "put", "go", "see", "know", "think", "come", "want",
  "look", "let", "set", "per", "via", "its", "our", "two", "one", "own",
]);

// ─── Business-domain synonym groups ──────────────────────────────────────────

const SYNONYM_GROUPS: readonly (readonly string[])[] = [
  ["client", "customer", "account", "buyer"],
  ["contract", "agreement", "deal", "engagement"],
  ["meeting", "call", "discussion", "session", "sync"],
  ["proposal", "offer", "bid", "pitch", "quote"],
  ["invoice", "bill", "receipt"],
  ["project", "initiative", "engagement"],
  ["service", "offering", "solution"],
  ["team", "staff", "crew", "members"],
  ["strategy", "plan", "approach", "roadmap"],
  ["goal", "objective", "target", "outcome"],
  ["report", "summary", "analysis", "overview"],
  ["process", "workflow", "procedure"],
  ["launch", "release", "deploy", "rollout"],
  ["budget", "cost", "expense", "spend"],
  ["campaign", "initiative", "program", "promotion"],
  ["revenue", "income", "earnings", "profit"],
  ["partner", "vendor", "supplier", "provider"],
  ["issue", "problem", "bug", "error"],
  ["feature", "capability", "function", "functionality"],
];

// Maps every term to its canonical (first) synonym in the group
const SYNONYM_MAP = new Map<string, string[]>();
for (const group of SYNONYM_GROUPS) {
  for (const term of group) {
    SYNONYM_MAP.set(
      term,
      group.filter((s) => s !== term)
    );
  }
}

// ─── Tokenizer ────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function score(token: string, freq: number, inTitle: boolean): number {
  const lengthBonus = Math.min(token.length / 12, 0.25);
  const titleMultiplier = inTitle ? 2.5 : 1;
  return (freq + lengthBonus) * titleMultiplier;
}

// ─── Synonyms ─────────────────────────────────────────────────────────────────

function collectSynonyms(keywords: string[]): string[] {
  const found = new Set<string>();
  const keySet = new Set(keywords);

  for (const kw of keywords) {
    const synonyms = SYNONYM_MAP.get(kw) ?? [];
    for (const syn of synonyms) {
      if (!keySet.has(syn)) found.add(syn);
    }
  }

  return Array.from(found);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Extracts primary and secondary keywords from content and an optional title.
 * The title is weighted 2.5× to reflect its editorial importance.
 * Returns synonym suggestions for all primary keywords.
 *
 * No external service is called.
 */
export function extractKeywords(
  content: string,
  title = "",
  maxPrimary = 10,
  maxSecondary = 15
): KnowledgeKeywords {
  const titleTokens = new Set(tokenize(title));
  // Title included twice to reflect editorial weight before the full text pass
  const allTokens = tokenize(`${title} ${title} ${content}`);

  const freq = new Map<string, number>();
  for (const token of allTokens) {
    freq.set(token, (freq.get(token) ?? 0) + 1);
  }

  const ranked = Array.from(freq.entries())
    .map(([token, count]) => ({
      token,
      score: score(token, count, titleTokens.has(token)),
    }))
    .sort((a, b) => b.score - a.score);

  const primary = ranked.slice(0, maxPrimary).map((r) => r.token);
  const secondary = ranked
    .slice(maxPrimary, maxPrimary + maxSecondary)
    .map((r) => r.token);
  const synonyms = collectSynonyms(primary);

  return { primary, secondary, synonyms };
}
