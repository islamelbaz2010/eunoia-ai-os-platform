// ─── Asset taxonomy ────────────────────────────────────────────────────────────

export const ASSET_TYPE = {
  DOCUMENT: "DOCUMENT",
  COMPANY: "COMPANY",
  CLIENT: "CLIENT",
  CONTACT: "CONTACT",
  LEAD: "LEAD",
  PROJECT: "PROJECT",
  SERVICE: "SERVICE",
  PRODUCT: "PRODUCT",
  CAMPAIGN: "CAMPAIGN",
  MEETING: "MEETING",
  EMAIL: "EMAIL",
  INVOICE: "INVOICE",
  FAQ: "FAQ",
  SOP: "SOP",
  POLICY: "POLICY",
  PROMPT: "PROMPT",
  TEMPLATE: "TEMPLATE",
  IMAGE: "IMAGE",
  VIDEO: "VIDEO",
  AUDIO: "AUDIO",
  WORKFLOW: "WORKFLOW",
  TOOL: "TOOL",
  API: "API",
  OTHER: "OTHER",
} as const;

export type AssetType = (typeof ASSET_TYPE)[keyof typeof ASSET_TYPE];

// ─── Department & Industry ────────────────────────────────────────────────────

export const DEPARTMENT = {
  Marketing: "Marketing",
  Sales: "Sales",
  CRM: "CRM",
  Operations: "Operations",
  Finance: "Finance",
  HR: "HR",
  Legal: "Legal",
  Engineering: "Engineering",
  AI: "AI",
  Support: "Support",
  Executive: "Executive",
  General: "General",
} as const;

export type Department = (typeof DEPARTMENT)[keyof typeof DEPARTMENT];

export const INDUSTRY = {
  "Real Estate": "Real Estate",
  Hotels: "Hotels",
  Travel: "Travel",
  Healthcare: "Healthcare",
  Restaurant: "Restaurant",
  Retail: "Retail",
  Education: "Education",
  Construction: "Construction",
  Government: "Government",
  Technology: "Technology",
  Manufacturing: "Manufacturing",
  Other: "Other",
} as const;

export type Industry = (typeof INDUSTRY)[keyof typeof INDUSTRY];

// ─── Status & visibility vocabulary ───────────────────────────────────────────

export type KnowledgeLanguage = "en" | "ar" | "mixed" | "unknown";
export type KnowledgeVisibility = "public" | "internal" | "restricted" | "private";
export type KnowledgeReviewStatus = "draft" | "pending_review" | "approved" | "rejected" | "archived";
export type KnowledgeBusinessCriticality = "critical" | "high" | "medium" | "low";
export type KnowledgeStatus = "active" | "draft" | "archived" | "deprecated" | "pending";

// ─── KB-2: Enterprise lifecycle & governance ──────────────────────────────────

export type AssetLifecycleStatus =
  | "Draft"
  | "Imported"
  | "Normalized"
  | "Extracted"
  | "Validated"
  | "Indexed"
  | "Published"
  | "Archived"
  | "Rejected";

export type AssetVisibility = "Public" | "Internal" | "Confidential" | "Restricted";
export type SecurityLevel = "Low" | "Medium" | "High" | "Critical";
export type AssetClassification =
  | "Business"
  | "Marketing"
  | "Sales"
  | "Operations"
  | "Finance"
  | "HR"
  | "Legal"
  | "Technology"
  | "Client"
  | "Vendor"
  | "Project"
  | "Company";

// ─── Knowledge domain taxonomy ────────────────────────────────────────────────

export type KnowledgeDomain =
  | "People"
  | "Organizations"
  | "Products"
  | "Services"
  | "Processes"
  | "Communications"
  | "Finance"
  | "Knowledge"
  | "Events"
  | "Campaigns";

// ─── Entity types ─────────────────────────────────────────────────────────────

export type KnowledgeEntityType =
  | "Company"
  | "Person"
  | "Service"
  | "Product"
  | "Client"
  | "Campaign"
  | "Brand"
  | "Location"
  | "Event"
  | "Phone"
  | "Email"
  | "Website"
  | "Technology"
  | "Platform"
  | "Tool";

// ─── Categories ───────────────────────────────────────────────────────────────

export type KnowledgeCategory =
  | "Company"
  | "Services"
  | "Clients"
  | "Projects"
  | "Marketing"
  | "Sales"
  | "Branding"
  | "Legal"
  | "Finance"
  | "HR"
  | "Technology"
  | "Processes"
  | "Events"
  | "Case Studies"
  | "Invoices"
  | "Meetings"
  | "Knowledge Base"
  | "General";

// ─── Document types ────────────────────────────────────────────────────────────

export type KnowledgeDocumentType =
  | "document"
  | "faq"
  | "sop"
  | "term"
  | "policy"
  | "case_study"
  | "meeting_notes"
  | "invoice"
  | "proposal"
  | "contract"
  | "general";

// ─── Relationship types ───────────────────────────────────────────────────────

export type KnowledgeRelationshipType =
  | "company_owns_service"
  | "company_worked_with_client"
  | "project_belongs_to_client"
  | "invoice_belongs_to_project"
  | "campaign_belongs_to_service"
  | "person_works_at_company"
  | "document_references_service"
  | "document_references_project"
  | "document_references_client";

export type RelationshipSubjectType = KnowledgeEntityType | "Document";

// ─── Core entity ──────────────────────────────────────────────────────────────

export interface KnowledgeEntity {
  readonly type: KnowledgeEntityType;
  readonly value: string;
  readonly normalized: string;
  readonly confidence: number; // 0–1
  readonly occurrences: number;
}

// ─── Relationship ─────────────────────────────────────────────────────────────

export interface KnowledgeRelationship {
  readonly type: KnowledgeRelationshipType;
  readonly subjectType: RelationshipSubjectType;
  readonly subject: string;
  readonly objectType: KnowledgeEntityType;
  readonly object: string;
  readonly confidence: number; // 0–1
}

// ─── Keywords ─────────────────────────────────────────────────────────────────

export interface KnowledgeKeywords {
  readonly primary: readonly string[];
  readonly secondary: readonly string[];
  readonly synonyms: readonly string[];
}

// ─── Tag ──────────────────────────────────────────────────────────────────────

export interface KnowledgeTag {
  readonly value: string;
  readonly normalized: string;
  readonly weight: number; // 0–1
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export interface KnowledgeMetadata {
  // Temporal
  readonly created: string;       // ISO 8601
  readonly modified: string;      // ISO 8601
  readonly lastVerifiedAt: string | null; // ISO 8601 — null = never verified
  // Authorship
  readonly author: string | null;
  readonly owner: string | null;
  readonly reviewer: string | null;
  // Classification
  readonly language: KnowledgeLanguage;
  readonly documentType: KnowledgeDocumentType;
  readonly department: Department;
  readonly industry: Industry;
  readonly version: string;
  // Governance
  readonly visibility: KnowledgeVisibility;
  readonly reviewStatus: KnowledgeReviewStatus;
  readonly businessCriticality: KnowledgeBusinessCriticality;
  readonly sourcePriority: number; // 1–10; 1 = highest
  readonly sourceUrl: string | null;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export interface KnowledgeScores {
  readonly importance: number;        // 0–1  strategic priority by category
  readonly freshness: number;         // 0–1  recency of last modification
  readonly confidence: number;        // 0–1  extraction quality
  readonly businessValue: number;     // 0–1  revenue/relationship relevance
  readonly aiUsefulness: number;      // 0–1  expected AI retrieval quality
  readonly knowledgeFreshness: number; // 0–1 recency of last human verification
  readonly verificationScore: number;  // 0–1 based on reviewStatus
}

// ─── Source ───────────────────────────────────────────────────────────────────

export interface KnowledgeSource {
  readonly type: "upload" | "web" | "crm" | "manual" | "import" | "api";
  readonly identifier: string;
  readonly label: string;
}

// ─── Reference ────────────────────────────────────────────────────────────────

export interface KnowledgeReference {
  readonly documentId: string;
  readonly title: string;
  readonly relationship: string;
}

// ─── Canonical asset (primary output model) ───────────────────────────────────

export interface KnowledgeAsset {
  readonly id: string;           // UUID  — internal identifier
  readonly canonicalId: string;  // KB-000001 — human-readable sequential ID
  readonly assetType: AssetType;
  readonly title: string;
  readonly summary: string;
  readonly content: string;
  readonly category: KnowledgeCategory;
  readonly keywords: KnowledgeKeywords;
  readonly entities: readonly KnowledgeEntity[];
  readonly relationships: readonly KnowledgeRelationship[];
  readonly tags: readonly KnowledgeTag[];
  readonly metadata: KnowledgeMetadata;
  readonly scores: KnowledgeScores;
  readonly source: KnowledgeSource;
  readonly references: readonly KnowledgeReference[];
  readonly referenceCount: number; // how many other assets cite this one (caller-managed)
  // ── KB-2: Enterprise governance ─────────────────────────────────────────────
  readonly sourceId: string | null;                    // FK → SourceRecord
  readonly assetVersion: number;                        // increments on each save
  readonly processingStatus: AssetLifecycleStatus;
  readonly validationStatus: "pending" | "valid" | "invalid";
  readonly visibility: AssetVisibility;                 // enterprise access control
  readonly classification: AssetClassification;
  readonly securityLevel: SecurityLevel;
  readonly reviewedBy: string | null;
  readonly approvedBy: string | null;
  readonly publishedAt: string | null;                  // ISO 8601 — set on publish
  readonly hash: string;                                // SHA-256 of cleaned content
  readonly etag: string;                                // "${hash}:${assetVersion}"
}

// KnowledgeDocument is a backwards-compatible alias for KnowledgeAsset.
export type KnowledgeDocument = KnowledgeAsset;

// ─── Chunk (sub-unit of an asset) ─────────────────────────────────────────────

export interface KnowledgeChunk {
  readonly id: string;
  readonly documentId: string; // parent asset UUID
  readonly sequence: number;
  readonly content: string;
  readonly summary: string;
  readonly keywords: readonly string[];
  readonly entities: readonly KnowledgeEntity[];
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface KnowledgeSearchResult {
  readonly asset: KnowledgeAsset;
  readonly relevance: number; // 0–1
  readonly matchedKeywords: readonly string[];
}

// ─── Duplicate detection ──────────────────────────────────────────────────────

export interface DuplicatePair {
  readonly aIndex: number;
  readonly bIndex: number;
  readonly similarity: number; // 0–1
  readonly type: "exact" | "near";
}

// ─── Raw input ────────────────────────────────────────────────────────────────

export interface RawAssetInput {
  readonly title: string;
  readonly content: string;
  readonly assetType?: AssetType;
  readonly category?: KnowledgeCategory;
  readonly metadata?: Partial<KnowledgeMetadata>;
  readonly source?: Partial<KnowledgeSource>;
  // KB-2 optional overrides (defaults are set by processAsset)
  readonly visibility?: AssetVisibility;
  readonly classification?: AssetClassification;
  readonly securityLevel?: SecurityLevel;
  readonly sourceId?: string | null;
}

// Backwards-compatible alias
export type RawKnowledgeInput = RawAssetInput;

// ─── Domain models ────────────────────────────────────────────────────────────

export interface KnowledgeFAQ {
  readonly question: string;
  readonly answer: string;
  readonly category: KnowledgeCategory;
  readonly source: string;
  readonly confidence: number; // 0–1
}

export interface KnowledgeSOPStep {
  readonly order: number;
  readonly description: string;
}

export interface KnowledgeSOP {
  readonly title: string;
  readonly steps: readonly KnowledgeSOPStep[];
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly owner: string | null;
  readonly tags: readonly string[];
}

export interface KnowledgeTerm {
  readonly term: string;
  readonly definition: string;
  readonly aliases: readonly string[];
  readonly category: KnowledgeCategory;
}

export interface KnowledgeClient {
  readonly id: string;
  readonly name: string;
  readonly industry: string | null;
  readonly contactPerson: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly website: string | null;
  readonly tags: readonly string[];
}

export interface KnowledgeService {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly tags: readonly string[];
}

export interface KnowledgeProject {
  readonly id: string;
  readonly name: string;
  readonly clientId: string | null;
  readonly status: "planning" | "active" | "completed" | "on_hold" | "cancelled";
  readonly tags: readonly string[];
}
