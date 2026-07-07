import { randomUUID } from "crypto";
import type { KnowledgeAsset } from "../types";
import type { ImportManifest, ImportError, ImportStatistics } from "./types";

export class ImportManifestBuilder {
  private readonly importId: string;
  private readonly startedAt: string;
  private readonly assetsCreated: string[] = [];
  private readonly assetsUpdated: string[] = [];
  private readonly errorsArr: ImportError[] = [];
  private readonly warningsArr: string[] = [];
  private filesProcessed = 0;
  private filesSkipped = 0;
  private duplicatesFound = 0;

  constructor() {
    this.importId = randomUUID();
    this.startedAt = new Date().toISOString();
  }

  recordCreated(assetId: string): this {
    this.assetsCreated.push(assetId);
    this.filesProcessed++;
    return this;
  }

  recordUpdated(assetId: string): this {
    this.assetsUpdated.push(assetId);
    this.filesProcessed++;
    return this;
  }

  recordError(file: string, error: string): this {
    this.errorsArr.push({ file, error });
    this.filesProcessed++;
    return this;
  }

  recordWarning(warning: string): this {
    this.warningsArr.push(warning);
    return this;
  }

  recordSkipped(): this {
    this.filesSkipped++;
    return this;
  }

  recordDuplicate(): this {
    this.duplicatesFound++;
    this.filesSkipped++;
    return this;
  }

  build(assets: readonly KnowledgeAsset[] = []): ImportManifest {
    const completedAt = new Date().toISOString();
    const durationMs = Math.max(
      0,
      new Date(completedAt).getTime() - new Date(this.startedAt).getTime()
    );

    const byAssetType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byLanguage: Record<string, number> = {};
    let totalQualityScore = 0;
    let totalEntityCount = 0;

    for (const asset of assets) {
      byAssetType[asset.assetType] = (byAssetType[asset.assetType] ?? 0) + 1;
      byCategory[asset.category] = (byCategory[asset.category] ?? 0) + 1;
      byLanguage[asset.metadata.language] =
        (byLanguage[asset.metadata.language] ?? 0) + 1;
      totalQualityScore += asset.scores.confidence;
      totalEntityCount += asset.entities.length;
    }

    const n = assets.length;
    const statistics: ImportStatistics = {
      totalAssets: n,
      byAssetType,
      byCategory,
      byLanguage,
      avgQualityScore:
        n > 0 ? Math.round((totalQualityScore / n) * 100) / 100 : 0,
      avgEntityCount:
        n > 0 ? Math.round((totalEntityCount / n) * 10) / 10 : 0,
    };

    return {
      importId: this.importId,
      startedAt: this.startedAt,
      completedAt,
      durationMs,
      filesProcessed: this.filesProcessed,
      filesSkipped: this.filesSkipped,
      duplicatesFound: this.duplicatesFound,
      errorsEncountered: this.errorsArr.length,
      warningsEncountered: this.warningsArr.length,
      assetsCreated: [...this.assetsCreated],
      assetsUpdated: [...this.assetsUpdated],
      errors: [...this.errorsArr],
      warnings: [...this.warningsArr],
      statistics,
    };
  }
}
