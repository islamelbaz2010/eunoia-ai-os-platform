# Knowledge Brain — Domain Models

All types live in `src/lib/knowledge/types.ts` and are re-exported from `knowledge.ts`.

## Core Models

### KnowledgeDocument

The primary output of `processDocument()`. Represents a fully-annotated, normalised document ready for storage, search, or AI consumption.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | UUID assigned at processing time |
| `title` | `string` | Cleaned title (NFC, whitespace-normalised) |
| `summary` | `string` | First paragraph, truncated to 300 chars |
| `content` | `string` | Full cleaned content (HTML stripped) |
| `category` | `KnowledgeCategory` | One of 18 business categories |
| `keywords` | `KnowledgeKeywords` | Primary, secondary, synonym arrays |
| `entities` | `KnowledgeEntity[]` | All extracted named entities |
| `relationships` | `KnowledgeRelationship[]` | Inferred entity relationships |
| `tags` | `KnowledgeTag[]` | Top-8 primary keywords with weights |
| `metadata` | `KnowledgeMetadata` | Dates, author, language, version |
| `scores` | `KnowledgeScores` | 5 quality/relevance dimensions |
| `source` | `KnowledgeSource` | Origin type and identifier |
| `references` | `KnowledgeReference[]` | Cross-document links (populated by caller) |

### KnowledgeChunk

Sub-unit of a document for future embedding pipelines. Produced by `chunkDocument()`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | UUID |
| `documentId` | `string` | Parent document UUID |
| `sequence` | `number` | 0-indexed position within document |
| `content` | `string` | Chunk text (default 500 words) |
| `summary` | `string` | First sentence / 150 chars |
| `keywords` | `string[]` | Top-5 keywords for this chunk |
| `entities` | `KnowledgeEntity[]` | Entities within this chunk |

### KnowledgeEntity

A named entity extracted from text.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `KnowledgeEntityType` | Company, Person, Email, Website, Phone, Technology, Platform, Tool, Service, Product, Client, Campaign, Brand, Location, Event |
| `value` | `string` | Raw extracted text |
| `normalized` | `string` | Lowercase form for deduplication/matching |
| `confidence` | `number` | 0–1 (Email/Website: 0.99; Company: 0.85; Person: 0.55) |
| `occurrences` | `number` | How many times it appears in the document |

### KnowledgeRelationship

An inferred relationship between two entities, or between the document and an entity.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `KnowledgeRelationshipType` | One of 9 defined relationship types |
| `subjectType` | `RelationshipSubjectType` | Entity type or `"Document"` |
| `subject` | `string` | Entity value or document ID |
| `objectType` | `KnowledgeEntityType` | Target entity type |
| `object` | `string` | Target entity value |
| `confidence` | `number` | Product of endpoint confidences × rule weight |

### KnowledgeScores

| Score | Description |
|-------|-------------|
| `importance` | Strategic priority — Sales/Invoices/Clients score highest |
| `freshness` | Recency of last modification (1.0 for ≤7 days; 0.2 for >1 year) |
| `confidence` | Content richness — entity count + content length |
| `businessValue` | Revenue/relationship relevance by category |
| `aiUsefulness` | Likelihood to produce good AI retrieval results |

## Vocabulary Models

### KnowledgeFAQ
Question + answer pairs with category, source, and confidence.

### KnowledgeSOP
Standard Operating Procedure with ordered steps, inputs, outputs, owner, and tags.

### KnowledgeTerm
Terminology entry with definition, aliases, and category.

## Domain Entities

### KnowledgeClient
Structured representation of a client with contact details and tags. Distinct from the `Client` entity type which is extracted from free text.

### KnowledgeService
A named service offering with description and category.

### KnowledgeProject
A project linked to a client with status lifecycle.

## Categories

```
Company       Services      Clients       Projects
Marketing     Sales         Branding      Legal
Finance       HR            Technology    Processes
Events        Case Studies  Invoices      Meetings
Knowledge Base              General
```

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
