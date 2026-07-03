# Knowledge Brain — Domain Models

All types live in `src/lib/knowledge/types.ts` and are re-exported from `knowledge.ts`.

## Taxonomy

### AssetType (24 values)

```
DOCUMENT   COMPANY   CLIENT    CONTACT   LEAD      PROJECT
SERVICE    PRODUCT   CAMPAIGN  MEETING   EMAIL     INVOICE
FAQ        SOP       POLICY    PROMPT    TEMPLATE  IMAGE
VIDEO      AUDIO     WORKFLOW  TOOL      API       OTHER
```

### Department (12 values)

```
Marketing  Sales  CRM  Operations  Finance  HR
Legal  Engineering  AI  Support  Executive  General
```

### Industry (12 values)

```
Real Estate  Hotels  Travel  Healthcare  Restaurant  Retail
Education  Construction  Government  Technology  Manufacturing  Other
```

### KnowledgeLanguage

`"en"` | `"ar"` | `"mixed"` | `"unknown"` — detected heuristically from character script ratios.

### KnowledgeVisibility

`"public"` | `"internal"` | `"restricted"` | `"private"`

### KnowledgeReviewStatus

`"draft"` | `"pending_review"` | `"approved"` | `"rejected"` | `"archived"`

### KnowledgeBusinessCriticality

`"critical"` | `"high"` | `"medium"` | `"low"`

---

## Core Models

### KnowledgeAsset

The canonical output of `processAsset()`. Every piece of knowledge — document, SOP, invoice, meeting notes, video metadata, workflow — is a `KnowledgeAsset`. `KnowledgeDocument` is a backwards-compatible type alias.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | UUID assigned at processing time |
| `canonicalId` | `string` | Human-readable sequential ID (KB-000001) |
| `assetType` | `AssetType` | Asset class (DOCUMENT, SOP, INVOICE, …) |
| `title` | `string` | Cleaned title (NFC, whitespace-normalised) |
| `summary` | `string` | First paragraph, truncated to 300 chars |
| `content` | `string` | Full cleaned content (HTML stripped) |
| `category` | `KnowledgeCategory` | One of 18 business categories |
| `keywords` | `KnowledgeKeywords` | Primary, secondary, synonym arrays |
| `entities` | `KnowledgeEntity[]` | All extracted named entities |
| `relationships` | `KnowledgeRelationship[]` | Inferred entity relationships |
| `tags` | `KnowledgeTag[]` | Top-8 primary keywords with weights |
| `metadata` | `KnowledgeMetadata` | Dates, author, language, classification, governance |
| `scores` | `KnowledgeScores` | 7 quality/relevance dimensions |
| `source` | `KnowledgeSource` | Origin type and identifier |
| `references` | `KnowledgeReference[]` | Cross-asset links (populated by caller) |
| `referenceCount` | `number` | How many other assets cite this one (caller-managed) |

### KnowledgeMetadata

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `created` | `string` | now | ISO 8601 creation timestamp |
| `modified` | `string` | now | ISO 8601 last-modified timestamp |
| `lastVerifiedAt` | `string\|null` | null | ISO 8601 last human-verification timestamp |
| `author` | `string\|null` | null | Original author |
| `owner` | `string\|null` | null | Responsible business owner |
| `reviewer` | `string\|null` | null | Last reviewer |
| `language` | `KnowledgeLanguage` | auto-detected | Script language of content |
| `documentType` | `KnowledgeDocumentType` | "document" | Structural type |
| `department` | `Department` | "General" | Owning department |
| `industry` | `Industry` | "Other" | Relevant industry vertical |
| `version` | `string` | "1.0" | Content version |
| `visibility` | `KnowledgeVisibility` | "internal" | Access scope |
| `reviewStatus` | `KnowledgeReviewStatus` | "draft" | Lifecycle status |
| `businessCriticality` | `KnowledgeBusinessCriticality` | "medium" | Business impact |
| `sourcePriority` | `number` | 5 | Source trust (1=highest, 10=lowest) |
| `sourceUrl` | `string\|null` | null | Origin URL |

### KnowledgeScores

All fields are in [0, 1] except where noted.

| Score | Inputs | Description |
|-------|--------|-------------|
| `importance` | category, documentType, entityCount | Strategic priority |
| `freshness` | `modified` age | Recency of last content modification |
| `confidence` | entity count, content length | Extraction quality |
| `businessValue` | category | Revenue / relationship relevance |
| `aiUsefulness` | category, entity+keyword count | Expected AI retrieval quality |
| `knowledgeFreshness` | `lastVerifiedAt` age | Recency of last human verification (0 = never verified) |
| `verificationScore` | `reviewStatus` | Approval lifecycle (approved=1.0, draft=0.3, rejected=0.1) |

### KnowledgeChunk

Sub-unit of an asset for future embedding pipelines. Produced by `chunkAsset()`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | UUID |
| `documentId` | `string` | Parent asset UUID |
| `sequence` | `number` | 0-indexed position within asset |
| `content` | `string` | Chunk text (default 500 words) |
| `summary` | `string` | First sentence / 150 chars |
| `keywords` | `string[]` | Top-5 keywords for this chunk |
| `entities` | `KnowledgeEntity[]` | Entities within this chunk |

### KnowledgeEntity

A named entity extracted from text.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `KnowledgeEntityType` | 15 types: Company, Person, Email, Website, Phone, Technology, Platform, Tool, Service, Product, Client, Campaign, Brand, Location, Event |
| `value` | `string` | Raw extracted text |
| `normalized` | `string` | Lowercase form for deduplication/matching |
| `confidence` | `number` | 0–1 (Email/Website: 0.99; Known Company: 0.90; Company+suffix: 0.85; Technology: 0.95; Person heuristic: 0.55) |
| `occurrences` | `number` | How many times it appears in the text |

### KnowledgeSearchResult

| Field | Type | Description |
|-------|------|-------------|
| `asset` | `KnowledgeAsset` | The matched asset |
| `relevance` | `number` | 0–1 relevance score |
| `matchedKeywords` | `string[]` | Query terms that matched |

---

## Relationship Types

```
company_owns_service          Company → Service
company_worked_with_client    Company → Client
project_belongs_to_client     Project → Client
invoice_belongs_to_project    Invoice → Project
campaign_belongs_to_service   Campaign → Service
person_works_at_company       Person → Company
document_references_service   Document → Service
document_references_project   Document → Project
document_references_client    Document → Client
```

---

## Categories (18 values)

```
Company       Services      Clients       Projects
Marketing     Sales         Branding      Legal
Finance       HR            Technology    Processes
Events        Case Studies  Invoices      Meetings
Knowledge Base              General
```

---

## Domain Models

### KnowledgeFAQ
Question + answer pairs with category, source, and confidence.

### KnowledgeSOP
Standard Operating Procedure with ordered steps, inputs, outputs, owner, and tags.

### KnowledgeTerm
Terminology entry with definition, aliases, and category.

### KnowledgeClient
Structured representation of a client with contact details and tags.

### KnowledgeService
A named service offering with description and category.

### KnowledgeProject
A project linked to a client with status lifecycle.
