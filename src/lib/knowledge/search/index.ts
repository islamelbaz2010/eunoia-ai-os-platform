import type {
  KnowledgeAsset,
  KnowledgeSearchResult,
  KnowledgeCategory,
  AssetType,
  Department,
  KnowledgeLanguage,
  AssetLifecycleStatus,
  AssetVisibility,
} from "../types";
import { normalizeForComparison } from "../normalizers/text";
import { extractKeywords } from "../extractors/keywords";

export interface AssetSearchOptions {
  readonly maxResults?: number;
  readonly minRelevance?: number;
  // pre-filter by metadata (applied before scoring)
  readonly category?: KnowledgeCategory;
  readonly assetType?: AssetType;
  readonly department?: Department;
  readonly language?: KnowledgeLanguage;
  readonly processingStatus?: AssetLifecycleStatus;
  readonly visibility?: AssetVisibility;
  readonly dateAfter?: string;       // metadata.modified >= dateAfter (ISO 8601)
  readonly dateBefore?: string;      // metadata.modified <= dateBefore (ISO 8601)
  readonly minConfidence?: number;   // scores.confidence >= minConfidence
}

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
 * Scores how relevant an asset is to a query token set.
 *
 * Matching in the title earns 3× weight.
 * Matching a primary keyword earns 2× weight.
 * Matching a secondary keyword earns 1.5× weight.
 * Matching body content earns 1× weight.
 *
 * The raw match score is normalised by query length, then blended with
 * the asset's own importance score (20% weight).
 */
function relevanceScore(
  asset: KnowledgeAsset,
  queryTokens: Set<string>
): { score: number; matched: string[] } {
  if (queryTokens.size === 0) return { score: 0, matched: [] };

  const matched = new Set<string>();
  const titleTokens = tokenSet(asset.title);
  const primarySet = new Set(asset.keywords.primary);
  const secondarySet = new Set(asset.keywords.secondary);
  const contentTokens = tokenSet(asset.content);

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

  const normalised = raw / (queryTokens.size * 3);
  const blended = normalised * 0.8 + asset.scores.importance * 0.2;

  return { score: Math.min(blended, 1), matched: Array.from(matched) };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Keyword-based full-text search across a collection of KnowledgeAssets.
 *
 * Returns results sorted by relevance descending, filtered to score > 0.
 * Category filter narrows results before scoring.
 *
 * No embedding or external service is used.
 */
export function searchAssets(
  assets: readonly KnowledgeAsset[],
  query: string,
  options: AssetSearchOptions = {}
): KnowledgeSearchResult[] {
  const {
    maxResults = 10,
    minRelevance = 0.05,
    category,
    assetType,
    department,
    language,
    processingStatus,
    visibility,
    dateAfter,
    dateBefore,
    minConfidence,
  } = options;

  if (!query.trim()) return [];

  const queryKeywords = extractKeywords(query, "", 20, 0);
  const queryTokens = new Set([
    ...tokenSet(query),
    ...queryKeywords.primary,
  ]);

  for (const syn of queryKeywords.synonyms) {
    queryTokens.add(syn);
  }

  const candidates = assets.filter((a) => {
    if (category !== undefined && a.category !== category) return false;
    if (assetType !== undefined && a.assetType !== assetType) return false;
    if (department !== undefined && a.metadata.department !== department)
      return false;
    if (language !== undefined && a.metadata.language !== language) return false;
    if (
      processingStatus !== undefined &&
      a.processingStatus !== processingStatus
    )
      return false;
    if (visibility !== undefined && a.visibility !== visibility) return false;
    if (dateAfter !== undefined && a.metadata.modified < dateAfter) return false;
    if (dateBefore !== undefined && a.metadata.modified > dateBefore)
      return false;
    if (minConfidence !== undefined && a.scores.confidence < minConfidence)
      return false;
    return true;
  });

  return candidates
    .map((asset) => {
      const { score, matched } = relevanceScore(asset, queryTokens);
      return { asset, relevance: score, matchedKeywords: matched };
    })
    .filter((r) => r.relevance >= minRelevance)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxResults);
}

/**
 * Returns the assets most similar to a seed asset by keyword overlap.
 * Useful for "related assets" / "you may also like" features.
 */
export function findRelatedAssets(
  seed: KnowledgeAsset,
  corpus: readonly KnowledgeAsset[],
  maxResults = 5
): KnowledgeSearchResult[] {
  const seedTokens = new Set([
    ...seed.keywords.primary,
    ...tokenSet(seed.title),
  ]);

  return corpus
    .filter((a) => a.id !== seed.id)
    .map((asset) => {
      const assetTokens = new Set([
        ...asset.keywords.primary,
        ...tokenSet(asset.title),
      ]);
      const hits = overlap(seedTokens, assetTokens);
      const relevance = hits / Math.max(seedTokens.size, 1);
      return {
        asset,
        relevance: Math.min(relevance, 1),
        matchedKeywords: Array.from(seedTokens).filter((t) => assetTokens.has(t)),
      };
    })
    .filter((r) => r.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxResults);
}

// Backwards-compatible aliases
export const searchDocuments = searchAssets;
export const findRelatedDocuments = findRelatedAssets;
