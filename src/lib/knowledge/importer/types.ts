// ─── Importer Types ───────────────────────────────────────────────────────────────

import type { KnowledgeCategory, KnowledgeLanguage } from "../types";

/**
 * Represents a file discovered during scanning.
 */
export interface FileMetadata {
  readonly path: string;
  readonly relativePath: string;
  readonly name: string;
  readonly extension: string;
  readonly mimeType: string | null;
  readonly size: number;
  readonly checksum: string;
  readonly modifiedAt: string;
  readonly createdAt: string;
  readonly language: KnowledgeLanguage;
  readonly category: KnowledgeCategory | null;
  readonly isSupported: boolean;
}

/**
 * Represents a scanned asset with its metadata.
 */
export interface ScannedAsset {
  readonly metadata: FileMetadata;
  readonly error: string | null;
}

/**
 * Represents a parsed asset with extracted text content.
 */
export interface ParsedAsset {
  readonly metadata: FileMetadata;
  readonly content: string;
  readonly error: string | null;
}

/**
 * Represents a classified asset with category assignment.
 */
export interface ClassifiedAsset {
  readonly metadata: FileMetadata;
  readonly content: string;
  readonly category: KnowledgeCategory;
  readonly confidence: number;
  readonly error: string | null;
}

/**
 * Scan options for controlling the scanning process.
 */
export interface ScanOptions {
  readonly recursive?: boolean;
  readonly includePatterns?: readonly string[];
  readonly excludePatterns?: readonly string[];
  readonly maxDepth?: number;
  readonly followSymlinks?: boolean;
}

/**
 * Parser options for controlling text extraction.
 */
export interface ParserOptions {
  readonly encoding?: BufferEncoding;
  readonly maxFileSize?: number;
  readonly preserveFormatting?: boolean;
}

/**
 * Classifier options for controlling auto-classification.
 */
export interface ClassifierOptions {
  readonly threshold?: number;
  readonly useKeywords?: boolean;
  readonly usePathHints?: boolean;
}

/**
 * Validator options for controlling quality checks.
 */
export interface ValidatorOptions {
  readonly maxFileSize?: number;
  readonly requiredFields?: readonly string[];
  readonly checkDuplicates?: boolean;
  readonly checkEncoding?: boolean;
}

/**
 * Quality validation result for a single asset.
 */
export interface ValidationResult {
  readonly assetPath: string;
  readonly passed: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Quality report summary.
 */
export interface QualityReport {
  readonly totalAssets: number;
  readonly passedAssets: number;
  readonly failedAssets: number;
  readonly warningCount: number;
  readonly errorCount: number;
  readonly missingMetadata: readonly string[];
  readonly duplicateFiles: readonly string[];
  readonly brokenFiles: readonly string[];
  readonly unreadableFiles: readonly string[];
  readonly unsupportedExtensions: readonly string[];
  readonly duplicateHashes: readonly string[];
  readonly oversizedFiles: readonly string[];
  readonly coverageStatistics: CoverageStatistics;
}

/**
 * Coverage statistics for quality report.
 */
export interface CoverageStatistics {
  readonly byCategory: Record<string, number>;
  readonly byExtension: Record<string, number>;
  readonly byLanguage: Record<string, number>;
  readonly averageFileSize: number;
  readonly totalSize: number;
}

/**
 * Index generation options.
 */
export interface IndexOptions {
  readonly outputPath: string;
  readonly format: "csv" | "json";
  readonly includeStatistics?: boolean;
}

/**
 * Asset index entry for CSV export.
 */
export interface AssetIndexEntry {
  readonly id: string;
  readonly path: string;
  readonly category: string;
  readonly extension: string;
  readonly size: number;
  readonly checksum: string;
  readonly modifiedAt: string;
  readonly language: string;
}

/**
 * Entity index entry for CSV export.
 */
export interface EntityIndexEntry {
  readonly assetId: string;
  readonly entityType: string;
  readonly entityValue: string;
  readonly confidence: number;
  readonly occurrences: number;
}

/**
 * Relationship index entry for CSV export.
 */
export interface RelationshipIndexEntry {
  readonly assetId: string;
  readonly relationshipType: string;
  readonly subject: string;
  readonly object: string;
  readonly confidence: number;
}

/**
 * Category index entry for CSV export.
 */
export interface CategoryIndexEntry {
  readonly category: string;
  readonly assetCount: number;
  readonly totalSize: number;
}

/**
 * Statistics for index generation.
 */
export interface IndexStatistics {
  readonly totalAssets: number;
  readonly totalEntities: number;
  readonly totalRelationships: number;
  readonly totalCategories: number;
  readonly byCategory: Record<string, { count: number; totalSize: number }>;
  readonly byExtension: Record<string, number>;
  readonly byLanguage: Record<string, number>;
  readonly generatedAt: string;
}

/**
 * Watch event types.
 */
export type WatchEventType = "add" | "change" | "unlink" | "addDir" | "unlinkDir";

/**
 * File system watch event.
 */
export interface WatchEvent {
  readonly type: WatchEventType;
  readonly path: string;
  readonly timestamp: string;
}

/**
 * Watch options for file system monitoring.
 */
export interface WatchOptions {
  readonly debounceMs?: number;
  readonly ignoreInitial?: boolean;
  readonly ignorePatterns?: string[];
}

/**
 * Registry entry for tracking processed assets.
 */
export interface RegistryEntry {
  readonly path: string;
  readonly checksum: string;
  readonly category: KnowledgeCategory;
  readonly processedAt: string;
  readonly lastModified: string;
  readonly version: number;
}

/**
 * Registry state.
 */
export interface RegistryState {
  entries: RegistryEntry[];
  lastUpdated: string;
  version: string;
}
