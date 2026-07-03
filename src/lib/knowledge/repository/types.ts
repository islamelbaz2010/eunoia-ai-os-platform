import type {
  KnowledgeAsset,
  KnowledgeCategory,
  AssetType,
  Department,
  Industry,
  KnowledgeLanguage,
  AssetLifecycleStatus,
  AssetVisibility,
  SecurityLevel,
  AssetClassification,
} from "../types";

// ─── Layer 1 — Source Record ──────────────────────────────────────────────────

export type SourceType =
  | "pdf"
  | "docx"
  | "pptx"
  | "markdown"
  | "website"
  | "crm"
  | "database"
  | "email"
  | "whatsapp"
  | "slack"
  | "github"
  | "notion"
  | "google_drive"
  | "manual"
  | "api"
  | "future";

export type SourceStatus = "pending" | "processing" | "active" | "failed" | "archived";

export interface SourceRecord {
  readonly id: string;
  readonly type: SourceType;
  readonly provider: string;         // e.g. "google", "microsoft", "manual"
  readonly originalPath: string;     // original file path or URL
  readonly mimeType: string | null;  // e.g. "application/pdf"
  readonly checksum: string;         // SHA-256 of original file content
  readonly size: number;             // bytes
  readonly createdAt: string;        // ISO 8601
  readonly modifiedAt: string;       // ISO 8601
  readonly owner: string | null;
  readonly organizationId: string | null;
  readonly status: SourceStatus;
}

// ─── Layer 3 — Knowledge Object ───────────────────────────────────────────────

export type KnowledgeObjectType =
  | "Entity"
  | "Relationship"
  | "Fact"
  | "Summary"
  | "Keyword"
  | "FAQ"
  | "SOP"
  | "Definition"
  | "Metric"
  | "Procedure"
  | "Insight"
  | "Reference"
  | "Chunk";

export interface KnowledgeObject {
  readonly id: string;
  readonly assetId: string;
  readonly type: KnowledgeObjectType;
  readonly content: string;
  readonly confidence: number;               // 0–1
  readonly importance: number;               // 0–1
  readonly createdAt: string;                // ISO 8601
  readonly references: readonly string[];    // other object IDs
  readonly relationships: readonly string[]; // relationship descriptions
}

// ─── Versioning ───────────────────────────────────────────────────────────────

export interface AssetVersion {
  readonly version: number;
  readonly assetId: string;
  readonly canonicalId: string;
  readonly hash: string;                    // SHA-256 of content at this version
  readonly etag: string;                    // "${hash}:${version}"
  readonly createdAt: string;               // ISO 8601 — when this version was saved
  readonly createdBy: string | null;
  readonly changeNote: string | null;
  readonly processingStatus: AssetLifecycleStatus;
  readonly validationStatus: "pending" | "valid" | "invalid";
  readonly asset: KnowledgeAsset;           // immutable full snapshot
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface ValidationReport {
  readonly assetId: string;
  readonly validatedAt: string;             // ISO 8601
  readonly qualityScore: number;            // 0–1
  readonly missingMetadata: readonly string[];
  readonly duplicateScore: number;          // 0–1 — caller populates via corpus scan
  readonly languageConfidence: number;      // 0–1
  readonly entityCount: number;
  readonly relationshipCount: number;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
  readonly passed: boolean;
}

export interface ProcessingReport {
  readonly assetId: string;
  readonly processedAt: string;             // ISO 8601
  readonly normalizationDurationMs: number;
  readonly extractionDurationMs: number;
  readonly keywordDurationMs: number;
  readonly relationshipDurationMs: number;
  readonly totalDurationMs: number;
  readonly stepsCompleted: readonly AssetLifecycleStatus[];
}

export interface ImportError {
  readonly file: string;
  readonly error: string;
}

export interface ImportStatistics {
  readonly totalAssets: number;
  readonly byAssetType: Readonly<Record<string, number>>;
  readonly byCategory: Readonly<Record<string, number>>;
  readonly byLanguage: Readonly<Record<string, number>>;
  readonly avgQualityScore: number;
  readonly avgEntityCount: number;
}

export interface ImportManifest {
  readonly importId: string;
  readonly startedAt: string;               // ISO 8601
  readonly completedAt: string;             // ISO 8601
  readonly durationMs: number;
  readonly filesProcessed: number;
  readonly filesSkipped: number;
  readonly duplicatesFound: number;
  readonly errorsEncountered: number;
  readonly warningsEncountered: number;
  readonly assetsCreated: readonly string[]; // asset IDs
  readonly assetsUpdated: readonly string[]; // asset IDs
  readonly errors: readonly ImportError[];
  readonly warnings: readonly string[];
  readonly statistics: ImportStatistics;
}

// ─── Queue (architecture only — no background workers) ────────────────────────

export type KnowledgeJobType =
  | "import"
  | "process"
  | "validate"
  | "index"
  | "archive"
  | "publish";

export type KnowledgeJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface KnowledgeJob {
  readonly id: string;
  readonly type: KnowledgeJobType;
  readonly status: KnowledgeJobStatus;
  readonly assetId: string | null;
  readonly sourceId: string | null;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly createdAt: string;              // ISO 8601
  readonly startedAt: string | null;       // ISO 8601
  readonly completedAt: string | null;     // ISO 8601
  readonly error: string | null;
  readonly priority: number;               // 1 = highest
}

export interface KnowledgeQueue {
  readonly jobs: readonly KnowledgeJob[];
  readonly pending: number;
  readonly running: number;
  readonly completed: number;
  readonly failed: number;
}

// ─── Indexes ──────────────────────────────────────────────────────────────────

export interface AssetIndex {
  readonly assetId: string;
  readonly canonicalId: string;
  readonly title: string;
  readonly assetType: AssetType;
  readonly category: KnowledgeCategory;
  readonly department: Department;
  readonly industry: Industry;
  readonly language: KnowledgeLanguage;
  readonly processingStatus: AssetLifecycleStatus;
  readonly visibility: AssetVisibility;
  readonly keywords: readonly string[];
  readonly createdAt: string;
  readonly modifiedAt: string;
}

export interface EntityIndex {
  readonly entityId: string;           // normalized entity value used as key
  readonly entityType: string;
  readonly assetIds: readonly string[];
  readonly occurrenceCount: number;
  readonly confidence: number;
}

export interface RelationshipIndex {
  readonly relationshipType: string;
  readonly subjectValue: string;
  readonly objectValue: string;
  readonly assetIds: readonly string[];
  readonly count: number;
}

export interface SourceIndex {
  readonly sourceId: string;
  readonly sourceType: SourceType;
  readonly assetIds: readonly string[];
  readonly checksum: string;
}

export interface CategoryIndex {
  readonly category: KnowledgeCategory;
  readonly assetCount: number;
  readonly assetIds: readonly string[];
}

export interface DepartmentIndex {
  readonly department: Department;
  readonly assetCount: number;
  readonly assetIds: readonly string[];
}

export interface IndustryIndex {
  readonly industry: Industry;
  readonly assetCount: number;
  readonly assetIds: readonly string[];
}

// ─── Repository operation types ───────────────────────────────────────────────

export interface AssetFilter {
  readonly category?: KnowledgeCategory;
  readonly assetType?: AssetType;
  readonly department?: Department;
  readonly industry?: Industry;
  readonly language?: KnowledgeLanguage;
  readonly processingStatus?: AssetLifecycleStatus;
  readonly validationStatus?: "pending" | "valid" | "invalid";
  readonly visibility?: AssetVisibility;
  readonly securityLevel?: SecurityLevel;
  readonly classification?: AssetClassification;
  readonly sourceId?: string;
  readonly dateAfter?: string;          // metadata.modified >= dateAfter (ISO 8601)
  readonly dateBefore?: string;         // metadata.modified <= dateBefore (ISO 8601)
  readonly minConfidence?: number;      // scores.confidence >= minConfidence
}

export interface AssetPatch {
  readonly processingStatus?: AssetLifecycleStatus;
  readonly validationStatus?: "pending" | "valid" | "invalid";
  readonly visibility?: AssetVisibility;
  readonly classification?: AssetClassification;
  readonly securityLevel?: SecurityLevel;
  readonly sourceId?: string | null;
  readonly reviewedBy?: string | null;
  readonly approvedBy?: string | null;
  readonly publishedAt?: string | null;
  readonly changeNote?: string | null;
}

export interface SaveOptions {
  readonly createdBy?: string | null;
  readonly changeNote?: string | null;
}

export interface UpdateOptions {
  readonly updatedBy?: string | null;
  readonly changeNote?: string | null;
}

export interface SaveResult {
  readonly asset: KnowledgeAsset;
  readonly version: AssetVersion;
  readonly isNew: boolean;
  readonly wasDuplicate: boolean;
}

export interface UpdateResult {
  readonly asset: KnowledgeAsset;
  readonly previousVersion: AssetVersion;
  readonly newVersion: AssetVersion;
}
