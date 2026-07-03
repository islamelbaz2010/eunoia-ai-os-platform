import type { KnowledgeDocument, KnowledgeSearchResult } from "../types";
import { normalizeForComparison } from "../normalizers/text";
import { extractKeywords } from "../extractors/keywords";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tokenSet(text: string): Set<string> {
  return new Set(
    normalizeForComparison(text)
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const item of a) {
    if (b.has(item)) count++;
  }
  return count;
}

/**
 * Scores how relevant a document is to a query token set.
 *
 * Matching in the title earns 3× weight.
 * Matching a primary keyword earns 2× weight.
 * Matching a secondary keyword earns 1.5× weight.
 * Matching body content earns 1× weight.
 *
 * The raw match score is normalised by query length, then blended with
 * the document's own importance score (20% weight) so high-value
 * documents are mildly preferred when relevance is equal.
 */
function relevanceScore(
  doc: KnowledgeDocument,
  queryTokens: Set<string>
): { score: number; matched: string[] } {
  if (queryTokens.size === 0) return { score: 0, matched: [] };

  const matched = new Set<string>();

  const titleTokens = tokenSet(doc.title);
  const primarySet = new Set(doc.keywords.primary);
  const secondarySet = new Set(doc.keywords.secondary);
  const contentTokens = tokenSet(doc.content);

  let raw = 0;

  for (const qt of queryTokens) {
    if (titleTokens.has(qt)) {
      raw += 3;
      matched.add(qt);
    } else if (primarySet.has(qt)) {
      raw += 2;
      matched.add(qt);
    } else if (secondarySet.has(qt)) {
      raw += 1.5;
      matched.add(qt);
    } else if (contentTokens.has(qt)) {
      raw += 1;
      matched.add(qt);
    }
  }

  // Normalise by query size so a 1-word query matching perfectly isn't penalised
  const normalised = raw / (queryTokens.size * 3);
  const blended = normalised * 0.8 + doc.scores.importance * 0.2;

  return { score: Math.min(blended, 1), matched: Array.from(matched) };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Keyword-based full-text search across a collection of KnowledgeDocuments.
 *
 * Returns results sorted by relevance descending, filtered to score > 0.
 * Category filter narrows results before scoring.
 *
 * No embedding or external service is used.
 */
export function searchDocuments(
  documents: readonly KnowledgeDocument[],
  query: string,
  options: {
    readonly maxResults?: number;
    readonly category?: KnowledgeDocument["category"];
    readonly minRelevance?: number;
  } = {}
): KnowledgeSearchResult[] {
  const { maxResults = 10, category, minRelevance = 0.05 } = options;

  if (!query.trim()) return [];

  const queryKeywords = extractKeywords(query, "", 20, 0);
  const queryTokens = new Set([
    ...tokenSet(query),
    ...queryKeywords.primary,
  ]);

  // Overlap with synonym expansions
  for (const syn of queryKeywords.synonyms) {
    queryTokens.add(syn);
  }

  const candidates = category
    ? documents.filter((d) => d.category === category)
    : documents;

  const scored = candidates
    .map((doc) => {
      const { score, matched } = relevanceScore(doc, queryTokens);
      return { document: doc, relevance: score, matchedKeywords: matched };
    })
    .filter((r) => r.relevance >= minRelevance)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxResults);

  return scored;
}

/**
 * Returns the documents most similar to a seed document by keyword overlap.
 * Useful for "related documents" features.
 */
export function findRelatedDocuments(
  seed: KnowledgeDocument,
  corpus: readonly KnowledgeDocument[],
  maxResults = 5
): KnowledgeSearchResult[] {
  const seedTokens = new Set([
    ...seed.keywords.primary,
    ...tokenSet(seed.title),
  ]);

  return corpus
    .filter((d) => d.id !== seed.id)
    .map((doc) => {
      const docTokens = new Set([
        ...doc.keywords.primary,
        ...tokenSet(doc.title),
      ]);
      const hits = overlap(seedTokens, docTokens);
      const relevance = hits / Math.max(seedTokens.size, 1);
      return {
        document: doc,
        relevance: Math.min(relevance, 1),
        matchedKeywords: Array.from(seedTokens).filter((t) => docTokens.has(t)),
      };
    })
    .filter((r) => r.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxResults);
}
