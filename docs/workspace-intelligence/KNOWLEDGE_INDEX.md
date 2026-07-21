# KNOWLEDGE INDEX

**Generated**: 2026-07-13
**Scope**: All knowledge artefacts across both repositories

---

## Canonical Schemas (KC — `docs/specifications/`)

| Schema | File | Purpose |
|--------|------|---------|
| Knowledge Pack | `knowledge-pack.schema.json` | Full Knowledge Pack directory structure, required fields, metadata |
| Manifest | `manifest.schema.json` | `manifest.json` shape — packId, version, components, compatibility, checksums |
| Taxonomy | `taxonomy.schema.json` | Taxonomy node structure, hierarchy rules, versioning |
| Dataset | `dataset.schema.json` | Dataset record format, provenance, lineage fields |
| Registry | `registry.schema.json` | Pack Registry entity model, operations, consistency |

---

## Industry Knowledge Packs (KC — `industries/`)

| Industry | Folder | Status |
|----------|--------|--------|
| Hotels | `industries/hotels/` | Stub — awaiting KC-1 content generation |
| Manufacturing | `industries/manufacturing/` | Stub — awaiting KC-1 content generation |
| Medical | `industries/medical/` | Stub — awaiting KC-1 content generation |
| Real Estate | `industries/real-estate/` | Stub — awaiting KC-1 content generation |
| Restaurants | `industries/restaurants/` | Stub — awaiting KC-1 content generation |
| Retail | `industries/retail/` | Stub — awaiting KC-1 content generation |
| Tourism | `industries/tourism/` | Stub — awaiting KC-1 content generation |

---

## Country Context Packs (KC — `countries/`)

| Country | Folder | Status |
|---------|--------|--------|
| Egypt | `countries/egypt/` | Stub — awaiting KC-1 content generation |
| Saudi Arabia | `countries/saudi/` | Stub — awaiting KC-1 content generation |
| UAE | `countries/uae/` | Stub — awaiting KC-1 content generation |
| Global | `countries/global/` | Stub — global baseline context |

---

## Core Domain Modules (KC — `core/`)

| Domain | Folder | Status |
|--------|--------|--------|
| AI | `core/ai/` | Domain stub |
| Business | `core/business/` | Domain stub |
| CRM | `core/crm/` | Domain stub |
| Finance | `core/finance/` | Domain stub |
| HR | `core/hr/` | Domain stub |
| Legal | `core/legal/` | Domain stub |
| Marketing | `core/marketing/` | Domain stub |

---

## Templates (KC — `templates/`)

| Status | Notes |
|--------|-------|
| Empty stub | Template definitions pending KC-1 implementation |

---

## Datasets (KC — `datasets/`)

| Status | Notes |
|--------|-------|
| Empty stub | Dataset generation pending KC-1 implementation |

---

## Prompts (KC — `prompts/`)

| Status | Notes |
|--------|-------|
| Empty stub | Generator prompts pending KC-1 implementation |

---

## Connectors (KC — `connectors/`)

| Status | Notes |
|--------|-------|
| Empty stub | Source connectors pending KC-1 implementation |

---

## Pack Manifests

| Location | File | Purpose |
|----------|------|---------|
| KC | `manifests/manifest.json` | Canonical pack registry manifest (stub) |
| KC | `versions/index.json` | Version index (stub) |
| Platform | `knowledge/manifests/import-manifest.json` | Local import manifest for working store |

---

## Platform Local Taxonomy (`knowledge/taxonomy/`)

| File | Contents |
|------|----------|
| `asset-types.json` | Classification of knowledge asset types |
| `categories.json` | Top-level knowledge categories |
| `departments.json` | Organisational department taxonomy |
| `entity-types.json` | Named entity type hierarchy |
| `industries.json` | Industry classification (local runtime copy) |
| `relationship-types.json` | Entity relationship type definitions |

---

## Platform Dictionaries (`knowledge/dictionaries/`)

Named-entity lookup tables for extraction and classification:

| File | Contents |
|------|----------|
| `brands.csv` | Known brand names |
| `cities.csv` | City name lookup |
| `companies.csv` | Company name list |
| `countries.csv` | Country codes and names |
| `industries.csv` | Industry labels |
| `people.csv` | People/role names |
| `platforms.csv` | Technology platform names |
| `products.csv` | Product names |
| `services.csv` | Service category labels |
| `technologies.csv` | Technology and tool names |

---

## Platform Raw Knowledge Assets (`knowledge/assets/raw/`)

Source documents ingested from actual business operations (26 files):

| Category | Contents |
|----------|----------|
| `brand/` | Eunoia logo files (3× PNG), brand CI PDF, logo.png |
| `company/` | Company charter / articles document (Arabic PDF) |
| `contracts/` | Monthly service contract (Arabic PDF) |
| `events/` | Al-Salmanya event budget PDF |
| `finance/` | 4 sales invoices (Arabic PDF, Radix/Al-Salmanya/Youssi clients) |
| `hr/` | Org chart 2026 PDF, salary scale PDF |
| `legal/` | (directory present, contents unlisted) |
| `marketing/` | Service catalogue PDF, production briefing PDF |
| `projects/` | (directory present) |
| `proposals/` | Gulf investment pitch PPTX, Radix 2026 plan PDF, investor circle docs (Arabic DOCX), loyalty programme PDFs, property event proposal PDF |

---

## Platform Reference Assets (`knowledge/assets/reference/`)

13 domain directories holding reference knowledge:

| Domain |
|--------|
| `ai/` |
| `branding/` |
| `business-frameworks/` |
| `crm/` |
| `finance/` |
| `hr/` |
| `legal/` |
| `marketing-frameworks/` |
| `operations/` |
| `sales-frameworks/` |
| `startup/` |
| `technology/` |

---

## Platform Knowledge Indexes (`knowledge/index/`)

| File | Contents |
|------|----------|
| `assets.csv` | Full index of all imported knowledge assets |
| `categories.csv` | Category assignment per asset |
| `entities.csv` | Extracted named entities |
| `import-history.csv` | Timestamped import log |
| `reference-assets.csv` | Reference asset index |
| `reference-import-history.csv` | Reference import log |
| `reference-sources.csv` | Reference source provenance |
| `relationships.csv` | Entity-to-entity relationship records |
| `sources.csv` | Source document provenance |
| `statistics.json` | Aggregate import statistics |

---

## Platform Knowledge Graph (`knowledge/graph/`)

| File | Contents |
|------|----------|
| `nodes.json` | Graph node definitions (entities, assets, concepts) |
| `edges.json` | Graph edge definitions (relationships) |
| `graph.json` | Full graph structure (nodes + edges combined) |

---

## Platform Prompts (`knowledge/prompts/`)

| Status | Notes |
|--------|-------|
| Directory present, README only | Runtime prompts pending population |

---

## Architecture Documentation (KC)

| Doc | Purpose |
|-----|---------|
| `01-system-overview.md` | Purpose, vision, goals, component boundaries |
| `02-layered-architecture.md` | 10 logical layers with responsibilities and dependencies |
| `03-component-specification.md` | Generator, Publisher, Registry, Validator, Taxonomy, Manifest |
| `04-event-driven-architecture.md` | Event catalog, payloads, producer/consumer relationships |
| `05-registry-design.md` | 8 registry types, entity model, multi-tenancy |
| `06-generator-specification.md` | Pipeline stages, inputs/outputs, reproducibility |
| `07-knowledge-pack-specification.md` | Directory layout, manifest, monetisation fields |
| `08-taxonomy-architecture.md` | Hierarchy, versioning, localisation, governance |
| `09-validation-specification.md` | Quality levels, deduplication, error handling |
| `10-publisher-specification.md` | Signing, channels, distribution, rollback |
| `11-ai-os-contract.md` | Consumption contract: discovery, manifest, integrity, error codes |
| `12-roadmap.md` | KC-0 through KC-4 phase plan and milestones |
| `ARCHITECTURE_VERSION.md` | Freeze record — v0.1.0, change policy |
| `KC-1_ARCHITECTURE_REVIEW.md` | Pre-KC-1 architecture review findings |
| `architecture-review-report.md` | Full review with improvements and recommendations |
| `adr/ADR-0001` | Architecture freeze decision |
| `adr/ADR-0002` | Knowledge Pack contract decision |
| `adr/ADR-0003` | Generator pipeline decision |
| `adr/ADR-0004` | Registry strategy decision |
