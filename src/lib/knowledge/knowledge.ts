import { randomUUID } from "crypto";

import type {
  KnowledgeCategory,
  KnowledgeChunk,
  KnowledgeDocument,
  KnowledgeMetadata,
  KnowledgeSource,
  RawKnowledgeInput,
  DuplicatePair,
} from "./types";
import { extractEntities } from "./extractors/entities";
import { extractKeywords } from "./extractors/keywords";
import { buildRelationships } from "./relationships/builder";
import { scoreDocument } from "./scoring/scorer";
import {
  normalizeWhitespace,
  stripHtml,
  truncate,
} from "./normalizers/text";
import { detectDuplicates } from "./normalizers/duplicates";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_CHUNK_SIZE = 500; // words per chunk

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

// ─── processDocument ─────────────────────────────────────────────────────────

/**
 * Converts raw input into a fully-annotated KnowledgeDocument.
 *
 * Performs: text normalisation → entity extraction → keyword extraction
 *   → relationship inference → scoring → tag generation
 *
 * No external service or embedding is invoked.
 */
export function processDocument(raw: RawKnowledgeInput): KnowledgeDocument {
  const id = randomUUID();
  const now = new Date().toISOString();

  const cleanContent = normalizeWhitespace(stripHtml(raw.content));
  const cleanTitle = normalizeWhitespace(raw.title);
  const category: KnowledgeCategory = raw.category ?? "General";

  const metadata: KnowledgeMetadata = {
    created: raw.metadata?.created ?? now,
    modified: raw.metadata?.modified ?? now,
    author: raw.metadata?.author ?? null,
    language: raw.metadata?.language ?? "en",
    documentType: raw.metadata?.documentType ?? "document",
    version: raw.metadata?.version ?? "1.0",
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

  return {
    id,
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
  };
}

// ─── chunkDocument ────────────────────────────────────────────────────────────

/**
 * Splits a KnowledgeDocument into ordered KnowledgeChunks.
 * Each chunk is independently annotated with entities and keywords.
 * Intended as input to embedding pipelines — not called in this sprint.
 */
export function chunkDocument(
  doc: KnowledgeDocument,
  chunkSize = DEFAULT_CHUNK_SIZE
): KnowledgeChunk[] {
  const rawChunks = splitIntoChunks(doc.content, chunkSize);

  return rawChunks.map((content, i) => {
    const chunkEntities = extractEntities(content);
    const { primary } = extractKeywords(content);
    return {
      id: randomUUID(),
      documentId: doc.id,
      sequence: i,
      content,
      summary: generateSummary(content, 150),
      keywords: primary.slice(0, 5),
      entities: chunkEntities,
    };
  });
}

// ─── findDuplicates ───────────────────────────────────────────────────────────

/**
 * Detects duplicate and near-duplicate documents by comparing both title
 * and content similarity. Returns all pairs that exceed the threshold.
 */
export function findDuplicates(
  documents: readonly KnowledgeDocument[],
  threshold = 0.8
): DuplicatePair[] {
  const titlePairs = detectDuplicates(
    documents.map((d) => d.title),
    threshold
  );
  const contentPairs = detectDuplicates(
    documents.map((d) => d.content),
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

// ─── Re-exports ───────────────────────────────────────────────────────────────

export type {
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
  RawKnowledgeInput,
} from "./types";

export { extractEntities } from "./extractors/entities";
export { extractKeywords } from "./extractors/keywords";
export { buildRelationships } from "./relationships/builder";
export { scoreDocument } from "./scoring/scorer";
export { searchDocuments, findRelatedDocuments } from "./search/index";
export {
  normalizeWhitespace,
  normalizeForComparison,
  stripHtml,
  truncate,
} from "./normalizers/text";
export { detectDuplicates, computeSimilarity } from "./normalizers/duplicates";
