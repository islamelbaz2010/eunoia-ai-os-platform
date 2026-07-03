import type {
  KnowledgeCategory,
  KnowledgeDocumentType,
  KnowledgeEntity,
  KnowledgeScores,
} from "../types";

// ─── Category weights ─────────────────────────────────────────────────────────

const IMPORTANCE_WEIGHTS: Readonly<Record<KnowledgeCategory, number>> = {
  Sales: 0.95,
  Invoices: 0.9,
  Clients: 0.9,
  Projects: 0.85,
  Legal: 0.85,
  Finance: 0.85,
  Services: 0.75,
  Marketing: 0.7,
  "Case Studies": 0.7,
  Branding: 0.65,
  Processes: 0.65,
  "Knowledge Base": 0.6,
  HR: 0.6,
  Technology: 0.6,
  Meetings: 0.55,
  Events: 0.5,
  Company: 0.5,
  General: 0.35,
};

const BUSINESS_VALUE_WEIGHTS: Readonly<Record<KnowledgeCategory, number>> = {
  Sales: 0.95,
  Clients: 0.9,
  Invoices: 0.9,
  Projects: 0.85,
  Finance: 0.85,
  "Case Studies": 0.8,
  Marketing: 0.7,
  Services: 0.7,
  Legal: 0.65,
  Branding: 0.6,
  Meetings: 0.55,
  HR: 0.5,
  Processes: 0.5,
  "Knowledge Base": 0.45,
  Technology: 0.45,
  Events: 0.4,
  Company: 0.4,
  General: 0.25,
};

const AI_USEFULNESS_WEIGHTS: Readonly<Record<KnowledgeCategory, number>> = {
  "Knowledge Base": 0.95,
  Processes: 0.9,
  Services: 0.85,
  "Case Studies": 0.8,
  Meetings: 0.75,
  Sales: 0.75,
  Clients: 0.7,
  Company: 0.65,
  HR: 0.6,
  Technology: 0.6,
  Marketing: 0.6,
  Projects: 0.55,
  Branding: 0.5,
  Legal: 0.5,
  Finance: 0.45,
  Events: 0.4,
  Invoices: 0.35,
  General: 0.3,
};

// ─── Freshness ────────────────────────────────────────────────────────────────

function freshnessScore(modifiedIso: string): number {
  const ageMs = Date.now() - new Date(modifiedIso).getTime();
  const ageDays = ageMs / 86_400_000;

  if (ageDays <= 7) return 1.0;
  if (ageDays <= 30) return 0.9;
  if (ageDays <= 90) return 0.75;
  if (ageDays <= 180) return 0.6;
  if (ageDays <= 365) return 0.4;
  return 0.2;
}

// ─── Composite scores ─────────────────────────────────────────────────────────

function importanceScore(
  category: KnowledgeCategory,
  documentType: KnowledgeDocumentType,
  entityCount: number
): number {
  const base = IMPORTANCE_WEIGHTS[category];
  const typeBonus =
    documentType === "sop" || documentType === "policy" ? 0.08
    : documentType === "contract" || documentType === "proposal" ? 0.06
    : 0;
  const entityBonus = Math.min(entityCount * 0.015, 0.12);
  return Math.min(base + typeBonus + entityBonus, 1);
}

function confidenceScore(
  entityCount: number,
  contentLength: number
): number {
  // Richer content with more extracted entities earns higher confidence
  const entityFactor = Math.min(entityCount * 0.04, 0.35);
  const densityFactor = Math.min(contentLength / 3000, 0.35);
  return Math.min(0.3 + entityFactor + densityFactor, 1);
}

function aiUsefulnessScore(
  category: KnowledgeCategory,
  entityCount: number,
  keywordCount: number
): number {
  const base = AI_USEFULNESS_WEIGHTS[category];
  const richness = Math.min((entityCount + keywordCount) * 0.015, 0.15);
  return Math.min(base + richness, 1);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Computes composite quality scores for a knowledge document.
 * All scores are in the range [0, 1].
 *
 * - importance: strategic priority based on category and document type
 * - freshness: how recently the document was modified
 * - confidence: extraction quality based on content richness
 * - businessValue: revenue/relationship relevance of the category
 * - aiUsefulness: how useful this content is likely to be for AI retrieval
 */
export function scoreDocument(
  category: KnowledgeCategory,
  metadata: { readonly modified: string; readonly documentType: KnowledgeDocumentType },
  entities: readonly KnowledgeEntity[],
  contentLength: number,
  keywordCount: number
): KnowledgeScores {
  return {
    importance: importanceScore(category, metadata.documentType, entities.length),
    freshness: freshnessScore(metadata.modified),
    confidence: confidenceScore(entities.length, contentLength),
    businessValue: BUSINESS_VALUE_WEIGHTS[category],
    aiUsefulness: aiUsefulnessScore(category, entities.length, keywordCount),
  };
}
