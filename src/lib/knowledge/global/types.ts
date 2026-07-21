// ─── Global Knowledge Types ───────────────────────────────────────────────────

/**
 * A document in the global knowledge layer (industry="global").
 * Conforms to knowledge/schemas/document.schema.json.
 */
export interface GlobalDocument {
  readonly schema_version: string;
  readonly id: string;
  readonly title: string;
  readonly version: string;
  readonly language: string;
  readonly country: string;
  readonly industry: 'global';
  readonly department: string;
  readonly tags: readonly string[];
  readonly priority: 'critical' | 'high' | 'medium' | 'low';
  readonly owner: string;
  readonly last_updated: string;
  readonly status: 'published' | 'draft' | 'archived';
  readonly content_type: string;
  readonly description: string;
  readonly body: string;
  readonly word_count?: number;
  readonly reading_time_minutes?: number;
  readonly ai_generated?: boolean;
  readonly checksum: string;
}

/** One entry in knowledge/global/manifest.json documents array */
export interface ManifestEntry {
  readonly path: string;
  readonly category: string;
  readonly language: string;
}

/** Root of knowledge/global/manifest.json */
export interface GlobalManifest {
  readonly version: string;
  readonly layer: 'global';
  readonly description: string;
  readonly created_at: string;
  readonly schema_version: string;
  readonly categories: Record<string, { description: string; document_count: number }>;
  readonly total_documents: number;
  readonly documents: readonly ManifestEntry[];
}

/** Result of loading a single document from disk */
export interface LoadResult {
  readonly path: string;
  readonly document: GlobalDocument;
  readonly category: string;
}

/** Summary emitted by loadAllGlobalDocuments */
export interface GlobalLoadSummary {
  readonly loaded: number;
  readonly errors: number;
  readonly documents: readonly LoadResult[];
  readonly errorDetails: ReadonlyArray<{ path: string; error: string }>;
}
