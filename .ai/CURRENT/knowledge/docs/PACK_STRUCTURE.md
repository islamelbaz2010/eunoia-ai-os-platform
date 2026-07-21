# Pack Structure

## Overview

A Knowledge Pack is a structured collection of documents organized by industry and department.
The Demo Enterprise Pack v1 contains the framework skeleton for 5 industries × 13 departments.

## Directory Tree

```
knowledge/
├── manifest.json                    # Global knowledge manifest
├── index.json                       # Document index (all packs)
├── statistics.json                  # Aggregate statistics
├── version.json                     # Version and changelog
├── contracts/                       # API contracts (OpenAPI, gRPC specs)
├── schemas/                         # Canonical JSON schemas (15 types)
│   ├── document.schema.json
│   ├── metadata.schema.json
│   ├── faq.schema.json
│   ├── playbook.schema.json
│   ├── policy.schema.json
│   ├── prompt.schema.json
│   ├── automation.schema.json
│   ├── template.schema.json
│   ├── campaign.schema.json
│   ├── persona.schema.json
│   ├── offer.schema.json
│   ├── service.schema.json
│   ├── department.schema.json
│   ├── kpi.schema.json
│   └── checklist.schema.json
├── templates/
│   └── import/                      # Import format specifications
│       ├── json.spec.json
│       ├── markdown.spec.json
│       ├── pdf.spec.json
│       ├── docx.spec.json
│       ├── csv.spec.json
│       ├── excel.spec.json
│       ├── notion.spec.json
│       └── gdocs.spec.json
├── tools/                           # CLI tools and utilities
├── scripts/                         # Automation scripts
├── docs/                            # Documentation (this directory)
│   ├── HOW_IMPORT_WORKS.md
│   ├── PACK_STRUCTURE.md
│   ├── NAMING_CONVENTION.md
│   ├── VERSIONING.md
│   ├── BEST_PRACTICES.md
│   ├── CONTENT_GUIDELINES.md
│   └── QUALITY_CHECKLIST.md
└── packs/
    └── demo-enterprise-v1/          # Demo Enterprise Pack v1
        ├── manifest.json            # Pack-level manifest
        ├── hotels/
        │   ├── README.md            # Industry overview
        │   ├── company/             # 13 departments, each with:
        │   │   ├── README.md        #   - Purpose and usage
        │   │   ├── schema.json      #   - Department-scoped schema
        │   │   ├── metadata.json    #   - Metadata template
        │   │   ├── manifest.json    #   - Department manifest
        │   │   ├── example.json     #   - Generation template (empty)
        │   │   └── validation.json  #   - Validation rules
        │   └── [...12 more depts]
        ├── restaurants/
        ├── medical-clinics/
        ├── real-estate/
        └── travel-agencies/
```

## File Roles

### `schema.json`
Defines the expected structure of documents in this department. References the canonical schema via `$ref`. Used by validation pipeline and AI generators.

### `metadata.json`
Metadata envelope describing the department's content collection. Updated when documents are added.

### `manifest.json`
Registry of all documents in this department. Each entry includes path, checksum, content type, and schema reference. Updated by import pipeline.

### `example.json`
Empty example structure showing the expected fields for AI content generation. Passed to Gemini as the generation template. Contains NO actual content.

### `validation.json`
Ordered list of validation rules applied to every document in this department. Rules have severity levels: `error`, `warning`, `info`.

## Schema Inheritance

```
document.schema.json            ← canonical base
    ↑
    └── {department}/schema.json ← industry + department scoped
            ↑
            └── actual documents
```

