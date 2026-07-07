// ─── Validator Module ────────────────────────────────────────────────────────────

import type { FileMetadata, ValidationResult, ValidatorOptions, QualityReport, CoverageStatistics } from "../types";
import { FileSystem } from "../filesystem";

export { AssetValidator };

/**
 * Validator for quality checks on knowledge assets.
 */
class AssetValidator {
  private readonly fs: FileSystem;
  private readonly defaultOptions: ValidatorOptions;

  constructor(fs: FileSystem, options: ValidatorOptions = {}) {
    this.fs = fs;
    this.defaultOptions = {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      requiredFields: [],
      checkDuplicates: true,
      checkEncoding: true,
      ...options,
    };
  }

  /**
   * Validate a single asset.
   */
  async validate(
    metadata: FileMetadata,
    content: string,
    options: ValidatorOptions = {}
  ): Promise<ValidationResult> {
    const opts = { ...this.defaultOptions, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size
    if (opts.maxFileSize && metadata.size > opts.maxFileSize) {
      errors.push(`File size (${metadata.size} bytes) exceeds maximum (${opts.maxFileSize} bytes)`);
    }

    // Check for empty content
    if (!content || content.trim().length === 0) {
      errors.push("File content is empty");
    }

    // Check for minimum content length
    if (content.length < 10) {
      warnings.push("File content is very short (< 10 characters)");
    }

    // Check for missing metadata
    if (!metadata.category) {
      warnings.push("Asset has no category assigned");
    }

    if (!metadata.mimeType) {
      warnings.push("Asset has no MIME type detected");
    }

    if (metadata.language === "unknown") {
      warnings.push("Asset language could not be detected");
    }

    // Check encoding
    if (opts.checkEncoding) {
      try {
        Buffer.from(content, "utf-8");
      } catch {
        errors.push("File content is not valid UTF-8");
      }
    }

    // Check for required fields
    if (opts.requiredFields) {
      const metadataRecord: Record<string, unknown> = { ...metadata };
      for (const field of opts.requiredFields) {
        if (metadataRecord[field] === null || metadataRecord[field] === undefined) {
          errors.push(`Required field '${field}' is missing`);
        }
      }
    }

    return {
      assetPath: metadata.path,
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate multiple assets and generate a quality report.
   */
  async validateBatch(
    assets: readonly { metadata: FileMetadata; content: string }[],
    options: ValidatorOptions = {}
  ): Promise<QualityReport> {
    const results = await Promise.all(
      assets.map((asset) => this.validate(asset.metadata, asset.content, options))
    );

    return this.generateReport(results, assets);
  }

  /**
   * Generate a quality report from validation results.
   */
  private generateReport(
    results: readonly ValidationResult[],
    assets: readonly { metadata: FileMetadata; content: string }[]
  ): QualityReport {
    const totalAssets = results.length;
    const passedAssets = results.filter((r) => r.passed).length;
    const failedAssets = totalAssets - passedAssets;

    const missingMetadata: string[] = [];
    const duplicateFiles: string[] = [];
    const brokenFiles: string[] = [];
    const unreadableFiles: string[] = [];
    const unsupportedExtensions: string[] = [];
    const duplicateHashes: string[] = [];
    const oversizedFiles: string[] = [];

    const hashMap = new Map<string, string[]>();
    const pathMap = new Map<string, string[]>();

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const asset = assets[i];

      // Collect errors and warnings
      for (const error of result.errors) {
        if (error.includes("size") && error.includes("exceeds")) {
          oversizedFiles.push(asset.metadata.path);
        }
        if (error.includes("empty") || error.includes("UTF-8")) {
          brokenFiles.push(asset.metadata.path);
        }
      }

      // Check for missing metadata
      if (!asset.metadata.category) {
        missingMetadata.push(asset.metadata.path);
      }

      // Check for unsupported extensions
      if (!asset.metadata.isSupported) {
        unsupportedExtensions.push(asset.metadata.path);
      }

      // Track duplicate hashes
      const hashEntries = hashMap.get(asset.metadata.checksum) || [];
      hashEntries.push(asset.metadata.path);
      hashMap.set(asset.metadata.checksum, hashEntries);

      // Track duplicate file names
      const nameEntries = pathMap.get(asset.metadata.name) || [];
      nameEntries.push(asset.metadata.path);
      pathMap.set(asset.metadata.name, nameEntries);
    }

    // Find duplicate hashes
    for (const [_hash, paths] of hashMap.entries()) {
      if (paths.length > 1) {
        duplicateHashes.push(...paths);
      }
    }

    // Find duplicate files (same name)
    for (const [_name, paths] of pathMap.entries()) {
      if (paths.length > 1) {
        duplicateFiles.push(...paths);
      }
    }

    // Calculate statistics
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    const coverageStatistics = this.calculateCoverageStatistics(assets);

    return {
      totalAssets,
      passedAssets,
      failedAssets,
      warningCount: totalWarnings,
      errorCount: totalErrors,
      missingMetadata,
      duplicateFiles,
      brokenFiles,
      unreadableFiles,
      unsupportedExtensions,
      duplicateHashes,
      oversizedFiles,
      coverageStatistics,
    };
  }

  /**
   * Calculate coverage statistics.
   */
  private calculateCoverageStatistics(
    assets: readonly { metadata: FileMetadata; content: string }[]
  ): CoverageStatistics {
    const byCategory: Record<string, number> = {};
    const byExtension: Record<string, number> = {};
    const byLanguage: Record<string, number> = {};

    let totalSize = 0;

    for (const asset of assets) {
      const { metadata } = asset;

      // By category
      const category = metadata.category || "Uncategorized";
      byCategory[category] = (byCategory[category] || 0) + 1;

      // By extension
      byExtension[metadata.extension] = (byExtension[metadata.extension] || 0) + 1;

      // By language
      byLanguage[metadata.language] = (byLanguage[metadata.language] || 0) + 1;

      totalSize += metadata.size;
    }

    const averageFileSize = assets.length > 0 ? totalSize / assets.length : 0;

    return {
      byCategory,
      byExtension,
      byLanguage,
      averageFileSize,
      totalSize,
    };
  }
}
