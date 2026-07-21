/**
 * Shared type definitions for the Knowledge Generation Pipeline.
 * All modules import from this file — no circular dependencies.
 */

// ─── Domain identifiers ───────────────────────────────────────────────────────

export type IndustryId =
  | 'hotels'
  | 'restaurants'
  | 'medical-clinics'
  | 'real-estate'
  | 'travel-agencies';

export type DepartmentId =
  | 'company'
  | 'operations'
  | 'sales'
  | 'marketing'
  | 'support'
  | 'faq'
  | 'templates'
  | 'prompts'
  | 'policies'
  | 'playbooks'
  | 'training'
  | 'automation'
  | 'analytics';

export type SchemaType =
  | 'document'
  | 'metadata'
  | 'faq'
  | 'playbook'
  | 'policy'
  | 'prompt'
  | 'automation'
  | 'template'
  | 'campaign'
  | 'persona'
  | 'offer'
  | 'service'
  | 'department'
  | 'kpi'
  | 'checklist';

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type DocumentStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived' | 'deprecated';
export type LLMProvider = 'gemini' | 'claude' | 'openai';
export type RunMode = 'single' | 'department' | 'industry' | 'pack';

// ─── Data models ──────────────────────────────────────────────────────────────

export interface Industry {
  id: IndustryId;
  name: string;
  code: string;
  description: string;
  naicsCode: string;
  domains: string[];
  promptContext: string;
  keyTerminology: string[];
  regulatoryContext: string[];
  enabled: boolean;
}

export interface Department {
  id: DepartmentId;
  name: string;
  description: string;
  schemaType: SchemaType;
  documentTypes: string[];
  promptGuidance: string;
  enabled: boolean;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  schemaType: SchemaType;
  priority: Priority;
  tags: string[];
  estimatedDocuments: number;
  documentTypes: string[];
}

export interface TopicsMap {
  version: string;
  totalTopics: number;
  industries: Record<string, { departments: Record<string, { topics: Topic[] }> }>;
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  enabled: boolean;
  promptLanguage: string;
}

export interface Country {
  code: string;
  name: string;
  region: string;
  defaultLanguage: string;
  enabled: boolean;
  industries: IndustryId[];
}

// ─── Configuration ────────────────────────────────────────────────────────────

export interface GeneratorConfig {
  version: string;
  packId: string;
  packVersion: string;
  knowledgeRoot: string;
  packRoot: string;
  schemasRoot: string;
  provider: {
    primary: LLMProvider;
    fallback: LLMProvider[];
    timeout: number;
    retries: number;
    retryDelayMs: number;
    rateLimit: { requestsPerMinute: number; tokensPerMinute: number };
    models: Record<LLMProvider, string>;
  };
  generation: {
    defaultLanguage: string;
    defaultCountry: string;
    temperature: number;
    maxTokens: number;
    dryRun: boolean;
    batchSize: number;
    delayBetweenRequestsMs: number;
    schemaVersion: string;
    defaultPriority: Priority;
    defaultStatus: DocumentStatus;
  };
  validation: {
    requireAllRequiredFields: boolean;
    failOnWarnings: boolean;
    maxErrors: number;
    maxWarnings: number;
    checksumAlgorithm: 'sha256';
    validateLanguageCode: boolean;
    validateCountryCode: boolean;
    validateUuid: boolean;
    validateSemver: boolean;
  };
  quality: {
    minimumScore: number;
    quarantineBelowScore: number;
    weights: { coverage: number; metadata: number; consistency: number; completeness: number };
  };
  output: {
    prettyPrint: boolean;
    overwriteExisting: boolean;
    quarantinePath: string;
    logPath: string;
    reportPath: string;
  };
  logging: { level: string; format: string; includeTimestamps: boolean };
}

// ─── Schema ───────────────────────────────────────────────────────────────────

export interface CanonicalSchema {
  $schema: string;
  title: string;
  description: string;
  type: string;
  required: string[];
  properties: Record<string, unknown>;
  additionalProperties: boolean;
}

// ─── Pipeline context ─────────────────────────────────────────────────────────

export interface GenerationContext {
  industry: Industry;
  department: Department;
  topic: Topic;
  language: Language;
  country: Country;
  schema: CanonicalSchema;
  config: GeneratorConfig;
  runId: string;
}

// ─── LLM interfaces ───────────────────────────────────────────────────────────

export interface LLMPrompt {
  system: string;
  user: string;
  schemaContext: CanonicalSchema;
  context: {
    industry: string;
    department: string;
    topic: string;
    language: string;
    country: string;
  };
  parameters: {
    temperature: number;
    maxTokens: number;
    responseFormat: 'json';
  };
}

export interface LLMResponse {
  content: string;
  raw: unknown;
  provider: LLMProvider;
  model: string;
  tokensUsed: { input: number; output: number; total: number };
  latencyMs: number;
}

export interface ProviderCredentials {
  gemini?: string;
  claude?: string;
  openai?: string;
}

// ─── Generated document ───────────────────────────────────────────────────────

export type GeneratedDocument = {
  id: string;
  schema_version: string;
  title: string;
  version: string;
  language: string;
  country: string;
  industry: IndustryId;
  department: DepartmentId;
  tags: string[];
  priority: Priority;
  owner: string;
  last_updated: string;
  status: DocumentStatus;
  checksum?: string;
  [key: string]: unknown;
};

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ValidationError {
  ruleId: string;
  field: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  actual?: unknown;
  expected?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
  document: GeneratedDocument;
  timestamp: string;
}

// ─── Quality score ────────────────────────────────────────────────────────────

export interface QualityDimension {
  name: string;
  score: number;
  maxScore: number;
  details: string[];
}

export interface QualityScore {
  total: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  dimensions: {
    coverage: QualityDimension;
    metadata: QualityDimension;
    consistency: QualityDimension;
    completeness: QualityDimension;
  };
  passed: boolean;
  minimumRequired: number;
}

// ─── Manifest ─────────────────────────────────────────────────────────────────

export interface ManifestComponent {
  path: string;
  contentType: string;
  checksum: string;
  schemaRef: string;
  size: number;
  topic: string;
  generatedAt: string;
  generationRunId: string;
  qualityScore: number;
}

// ─── Pipeline results ─────────────────────────────────────────────────────────

export interface DocumentResult {
  industry: IndustryId;
  department: DepartmentId;
  topic: string;
  filePath: string;
  documentId: string;
  qualityScore: number;
  status: 'success' | 'failed' | 'quarantined' | 'skipped' | 'dry-run';
  error?: string;
  durationMs: number;
}

export interface PipelineResult {
  runId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  mode: RunMode;
  scope: {
    industry?: IndustryId;
    department?: DepartmentId;
    topic?: string;
    language: string;
    country: string;
  };
  provider: LLMProvider;
  dryRun: boolean;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    quarantined: number;
    skipped: number;
    dryRun: number;
  };
  documents: DocumentResult[];
  errors: string[];
}

// ─── Runner options ───────────────────────────────────────────────────────────

export interface RunnerOptions {
  mode: RunMode;
  industry?: IndustryId;
  department?: DepartmentId;
  topic?: string;
  language?: string;
  country?: string;
  provider?: LLMProvider;
  dryRun?: boolean;
  overwrite?: boolean;
  credentials?: ProviderCredentials;
}
