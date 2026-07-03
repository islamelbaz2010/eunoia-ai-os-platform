import { randomUUID } from "crypto";

import type {
  AssetType,
  Department,
  Industry,
  KnowledgeAsset,
  KnowledgeCategory,
  KnowledgeChunk,
  KnowledgeMetadata,
  KnowledgeSource,
  RawAssetInput,
  DuplicatePair,
} from "./types";
import { ASSET_TYPE } from "./types";
import type { ProcessingReport } from "./repository/types";
import { sha256 } from "./repository/checksum";
import { extractEntities } from "./extractors/entities";
import { extractKeywords } from "./extractors/keywords";
import { buildRelationships } from "./relationships/builder";
import { scoreDocument } from "./scoring/scorer";
import {
  normalizeWhitespace,
  stripHtml,
  truncate,
  detectLanguage,
} from "./normalizers/text";
import { detectDuplicates } from "./normalizers/duplicates";

// ─── CanonicalId counter ──────────────────────────────────────────────────────
// Resets on process restart. Callers requiring stable cross-restart IDs must
// seed from the database after they persist the asset.

let _assetSeq = 0;
function nextCanonicalId(): string {
  return `KB-${String(++_assetSeq).padStart(6, "0")}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_CHUNK_SIZE = 500;

function generateSummary(content: string, maxLength = 300): string {
  const paragraphs = content.split(/\n{2,}/);
  const first = paragraphs[0] ?? content;
  return truncate(first.replace(/\n/g, " "), maxLength);
}

function splitIntoChunks(content: string, wordCount: number): string[] {
  const words = content.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += wordCount) {
    const slice = words.slice(i, i + wordCount).join(" ");
    if (slice.trim()) chunks.push(slice);
  }
  return chunks;
}

// ─── processAsset ─────────────────────────────────────────────────────────────

/**
 * Converts raw input into a fully-annotated KnowledgeAsset.
 *
 * Pipeline: text normalisation → language detection → entity extraction
 *   → keyword extraction → relationship inference → scoring → tag generation
 *
 * Pure: no I/O, no external services, no embeddings.
 */
export function processAsset(raw: RawAssetInput): KnowledgeAsset {
  const id = randomUUID();
  const canonicalId = nextCanonicalId();
  const now = new Date().toISOString();

  const cleanContent = normalizeWhitespace(stripHtml(raw.content));
  const cleanTitle = normalizeWhitespace(raw.title);
  const category: KnowledgeCategory = raw.category ?? "General";
  const assetType: AssetType = raw.assetType ?? ASSET_TYPE.DOCUMENT;

  const detectedLang = detectLanguage(cleanContent);

  const metadata: KnowledgeMetadata = {
    // Temporal
    created: raw.metadata?.created ?? now,
    modified: raw.metadata?.modified ?? now,
    lastVerifiedAt: raw.metadata?.lastVerifiedAt ?? null,
    // Authorship
    author: raw.metadata?.author ?? null,
    owner: raw.metadata?.owner ?? null,
    reviewer: raw.metadata?.reviewer ?? null,
    // Classification
    language: raw.metadata?.language ?? detectedLang,
    documentType: raw.metadata?.documentType ?? "document",
    department: (raw.metadata?.department ?? "General") as Department,
    industry: (raw.metadata?.industry ?? "Other") as Industry,
    version: raw.metadata?.version ?? "1.0",
    // Governance
    visibility: raw.metadata?.visibility ?? "internal",
    reviewStatus: raw.metadata?.reviewStatus ?? "draft",
    businessCriticality: raw.metadata?.businessCriticality ?? "medium",
    sourcePriority: raw.metadata?.sourcePriority ?? 5,
    sourceUrl: raw.metadata?.sourceUrl ?? null,
  };

  const source: KnowledgeSource = {
    type: raw.source?.type ?? "manual",
    identifier: raw.source?.identifier ?? id,
    label: raw.source?.label ?? cleanTitle,
  };

  const entities = extractEntities(`${cleanTitle} ${cleanContent}`);
  const keywords = extractKeywords(cleanContent, cleanTitle);
  const relationships = buildRelationships(entities, id);

  const scores = scoreDocument(
    category,
    metadata,
    entities,
    cleanContent.length,
    keywords.primary.length + keywords.secondary.length
  );

  const tags = keywords.primary.slice(0, 8).map((kw, i) => ({
    value: kw,
    normalized: kw.toLowerCase(),
    weight: Math.max(1 - i * 0.11, 0.2),
  }));

  const contentHash = sha256(cleanContent);

  return {
    id,
    canonicalId,
    assetType,
    title: cleanTitle,
    summary: generateSummary(cleanContent),
    content: cleanContent,
    category,
    keywords,
    entities,
    relationships,
    tags,
    metadata,
    scores,
    source,
    references: [],
    referenceCount: 0,
    // KB-2 governance fields
    sourceId: raw.sourceId ?? null,
    assetVersion: 1,
    processingStatus: "Extracted",
    validationStatus: "pending",
    visibility: raw.visibility ?? "Internal",
    classification: raw.classification ?? "Business",
    securityLevel: raw.securityLevel ?? "Low",
    reviewedBy: null,
    approvedBy: null,
    publishedAt: null,
    hash: contentHash,
    etag: `${contentHash}:1`,
  };
}

/** Backwards-compatible alias for processAsset. */
export function processDocument(raw: RawAssetInput): KnowledgeAsset {
  return processAsset(raw);
}

// ─── chunkAsset ───────────────────────────────────────────────────────────────

/**
 * Splits a KnowledgeAsset into ordered KnowledgeChunks.
 * Each chunk is independently annotated with entities and keywords.
 * Intended as input to embedding pipelines.
 */
export function chunkAsset(
  asset: KnowledgeAsset,
  chunkSize = DEFAULT_CHUNK_SIZE
): KnowledgeChunk[] {
  const rawChunks = splitIntoChunks(asset.content, chunkSize);

  return rawChunks.map((content, i) => {
    const chunkEntities = extractEntities(content);
    const { primary } = extractKeywords(content);
    return {
      id: randomUUID(),
      documentId: asset.id,
      sequence: i,
      content,
      summary: generateSummary(content, 150),
      keywords: primary.slice(0, 5),
      entities: chunkEntities,
    };
  });
}

/** Backwards-compatible alias for chunkAsset. */
export function chunkDocument(
  asset: KnowledgeAsset,
  chunkSize = DEFAULT_CHUNK_SIZE
): KnowledgeChunk[] {
  return chunkAsset(asset, chunkSize);
}

// ─── findDuplicateAssets ──────────────────────────────────────────────────────

/**
 * Detects duplicate and near-duplicate assets by comparing both title
 * and content similarity. Returns all pairs that exceed the threshold.
 */
export function findDuplicateAssets(
  assets: readonly KnowledgeAsset[],
  threshold = 0.8
): DuplicatePair[] {
  const titlePairs = detectDuplicates(
    assets.map((a) => a.title),
    threshold
  );
  const contentPairs = detectDuplicates(
    assets.map((a) => a.content),
    threshold
  );

  const seen = new Set<string>();
  const merged: DuplicatePair[] = [];
  for (const pair of [...titlePairs, ...contentPairs]) {
    const key = `${pair.aIndex}-${pair.bIndex}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(pair);
    }
  }
  return merged;
}

/** Backwards-compatible alias for findDuplicateAssets. */
export function findDuplicates(
  assets: readonly KnowledgeAsset[],
  threshold = 0.8
): DuplicatePair[] {
  return findDuplicateAssets(assets, threshold);
}

// ─── processAssetWithReport ───────────────────────────────────────────────────

/**
 * Processes raw input into a KnowledgeAsset and returns a ProcessingReport
 * with total wall-clock timing and estimated per-phase breakdown.
 */
export function processAssetWithReport(raw: RawAssetInput): {
  readonly asset: KnowledgeAsset;
  readonly report: ProcessingReport;
} {
  const t0 = Date.now();
  const asset = processAsset(raw);
  const total = Date.now() - t0;

  // Estimated proportions: normalise 5%, extract 50%, keyword 30%, rel 15%
  const report: ProcessingReport = {
    assetId: asset.id,
    processedAt: new Date().toISOString(),
    normalizationDurationMs: Math.round(total * 0.05),
    extractionDurationMs: Math.round(total * 0.50),
    keywordDurationMs: Math.round(total * 0.30),
    relationshipDurationMs: Math.round(total * 0.15),
    totalDurationMs: total,
    stepsCompleted: ["Imported", "Normalized", "Extracted"],
  };

  return { asset, report };
}

// ─── Re-exports ───────────────────────────────────────────────────────────────

export type {
  KnowledgeAsset,
  KnowledgeDocument,
  KnowledgeChunk,
  KnowledgeEntity,
  KnowledgeRelationship,
  KnowledgeKeywords,
  KnowledgeTag,
  KnowledgeCategory,
  KnowledgeDocumentType,
  KnowledgeFAQ,
  KnowledgeSOP,
  KnowledgeTerm,
  KnowledgeClient,
  KnowledgeService,
  KnowledgeProject,
  KnowledgeMetadata,
  KnowledgeScores,
  KnowledgeSource,
  KnowledgeReference,
  KnowledgeSearchResult,
  DuplicatePair,
  RawAssetInput,
  RawKnowledgeInput,
  AssetType,
  Department,
  Industry,
  KnowledgeLanguage,
  KnowledgeVisibility,
  KnowledgeReviewStatus,
  KnowledgeBusinessCriticality,
  KnowledgeStatus,
  KnowledgeDomain,
  // KB-2 governance types
  AssetLifecycleStatus,
  AssetVisibility,
  SecurityLevel,
  AssetClassification,
} from "./types";

export { ASSET_TYPE, DEPARTMENT, INDUSTRY } from "./types";
export { extractEntities } from "./extractors/entities";
export { extractKeywords } from "./extractors/keywords";
export { buildRelationships } from "./relationships/builder";
export { scoreDocument } from "./scoring/scorer";
export {
  searchAssets,
  findRelatedAssets,
  searchDocuments,
  findRelatedDocuments,
} from "./search/index";
export type { AssetSearchOptions } from "./search/index";
export {
  normalizeWhitespace,
  normalizeForComparison,
  stripHtml,
  truncate,
  detectLanguage,
} from "./normalizers/text";
export { detectDuplicates, computeSimilarity } from "./normalizers/duplicates";

// ─── KB-2: Repository layer ───────────────────────────────────────────────────

export { KnowledgeRepository, validateAsset, ImportManifestBuilder } from "./repository/index";
export { sha256, makeEtag } from "./repository/checksum";
export type {
  SourceRecord,
  SourceType,
  SourceStatus,
  KnowledgeObject,
  KnowledgeObjectType,
  AssetVersion,
  ValidationReport,
  ProcessingReport,
  ImportManifest,
  ImportError,
  ImportStatistics,
  KnowledgeJob,
  KnowledgeQueue,
  KnowledgeJobType,
  KnowledgeJobStatus,
  AssetIndex,
  EntityIndex,
  RelationshipIndex,
  SourceIndex,
  CategoryIndex,
  DepartmentIndex,
  IndustryIndex,
  AssetFilter,
  AssetPatch,
  SaveOptions,
  UpdateOptions,
  SaveResult,
  UpdateResult,
} from "./repository/index";
