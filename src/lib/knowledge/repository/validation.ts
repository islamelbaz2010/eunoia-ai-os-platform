import type { KnowledgeAsset } from "../types";
import type { ValidationReport } from "./types";

export function validateAsset(
  asset: KnowledgeAsset,
  options: { duplicateScore?: number } = {}
): ValidationReport {
  const warnings: string[] = [];
  const errors: string[] = [];
  const missingMetadata: string[] = [];

  if (!asset.metadata.author) missingMetadata.push("author");
  if (!asset.metadata.owner) missingMetadata.push("owner");
  if (!asset.metadata.reviewer) missingMetadata.push("reviewer");
  if (!asset.metadata.lastVerifiedAt) missingMetadata.push("lastVerifiedAt");

  if (asset.content.length < 50) {
    warnings.push("Content is very short (< 50 chars) — consider enriching");
  }
  if (asset.entities.length === 0) {
    warnings.push("No entities extracted — content may be unstructured");
  }
  if (asset.keywords.primary.length === 0) {
    errors.push("No keywords extracted — content is too short or empty");
  }
  if (asset.metadata.reviewStatus === "rejected") {
    errors.push("Asset is rejected — review and correct before publishing");
  }
  if (asset.processingStatus === "Rejected") {
    errors.push("Asset lifecycle is Rejected — re-process required");
  }

  const languageConfidence =
    asset.metadata.language === "unknown"
      ? 0.0
      : asset.metadata.language === "mixed"
        ? 0.6
        : 1.0;

  const metadataCompleteness = 1 - missingMetadata.length / 4;
  const contentQuality = Math.min(asset.content.length / 500, 1);
  const entityRichness = Math.min(asset.entities.length / 5, 1);
  const qualityScore = Math.round(
    (metadataCompleteness * 0.3 +
      contentQuality * 0.3 +
      entityRichness * 0.2 +
      asset.scores.confidence * 0.2) *
      100
  ) / 100;

  const passed = errors.length === 0 && qualityScore >= 0.3;

  return {
    assetId: asset.id,
    validatedAt: new Date().toISOString(),
    qualityScore,
    missingMetadata,
    duplicateScore: options.duplicateScore ?? 0,
    languageConfidence,
    entityCount: asset.entities.length,
    relationshipCount: asset.relationships.length,
    warnings,
    errors,
    passed,
  };
}
