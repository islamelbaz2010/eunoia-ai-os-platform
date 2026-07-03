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

// Subject of a relationship is either a known entity type or the document itself
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
  readonly created: string; // ISO 8601
  readonly modified: string; // ISO 8601
  readonly author: string | null;
  readonly language: string; // BCP 47 e.g. "en"
  readonly documentType: KnowledgeDocumentType;
  readonly version: string;
  readonly sourceUrl: string | null;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export interface KnowledgeScores {
  readonly importance: number; // 0–1
  readonly freshness: number; // 0–1
  readonly confidence: number; // 0–1
  readonly businessValue: number; // 0–1
  readonly aiUsefulness: number; // 0–1
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

// ─── Processed document (output) ──────────────────────────────────────────────

export interface KnowledgeDocument {
  readonly id: string;
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
}

// ─── Chunk (sub-unit of a document) ──────────────────────────────────────────

export interface KnowledgeChunk {
  readonly id: string;
  readonly documentId: string;
  readonly sequence: number;
  readonly content: string;
  readonly summary: string;
  readonly keywords: readonly string[];
  readonly entities: readonly KnowledgeEntity[];
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface KnowledgeSearchResult {
  readonly document: KnowledgeDocument;
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

export interface RawKnowledgeInput {
  readonly title: string;
  readonly content: string;
  readonly category?: KnowledgeCategory;
  readonly metadata?: Partial<KnowledgeMetadata>;
  readonly source?: Partial<KnowledgeSource>;
}
