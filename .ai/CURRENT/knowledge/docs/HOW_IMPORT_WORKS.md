# How Import Works

## Overview

The Eunoia AI OS Knowledge Cloud accepts content from multiple formats and normalizes it into the canonical schema structure. This document describes the end-to-end import pipeline.

## Supported Formats

| Format | Spec File | MIME Type |
|--------|-----------|-----------|
| JSON | `templates/import/json.spec.json` | `application/json` |
| Markdown | `templates/import/markdown.spec.json` | `text/markdown` |
| PDF | `templates/import/pdf.spec.json` | `application/pdf` |
| DOCX | `templates/import/docx.spec.json` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| CSV | `templates/import/csv.spec.json` | `text/csv` |
| Excel | `templates/import/excel.spec.json` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| Notion Export | `templates/import/notion.spec.json` | `application/zip` |
| Google Docs | `templates/import/gdocs.spec.json` | `application/zip` |

## Import Pipeline

```
Input File
    │
    ▼
Format Detection
    │
    ▼
Format-Specific Parser
    │
    ▼
Field Mapping (per spec file)
    │
    ▼
Transformation Rules
    │  - strip_html
    │  - normalize_dates
    │  - trim_whitespace
    │  - normalize_encoding
    ▼
Schema Validation
    │
    ├─ PASS ──▶ Write to industry/department folder
    │
    └─ FAIL ──▶ Quarantine folder + error log
    │
    ▼
Checksum Generation
    │
    ▼
Manifest Update
    │
    ▼
Index Update
    │
    ▼
Embedding (RAG pipeline)
```

## Field Mapping

Each import spec file defines how source fields map to canonical fields. Mappings include:
- **source_field** — Path in source document (dot notation for nested)
- **target_field** — Canonical schema field name
- **required** — Whether mapping failure aborts the import
- **transform** — Transformation to apply (see transforms below)
- **default** — Default value if source field is absent

## Transformations

| Transform | Description |
|-----------|-------------|
| `iso8601` | Parse any date format to ISO 8601 |
| `array-or-split` | Accept array or split string by comma |
| `split-comma` | Split string by comma into array |
| `split-pipe` | Split string by pipe into array |
| `split-semicolon` | Split string by semicolon into array |
| `clean-whitespace` | Collapse multiple spaces and trim |
| `docx-to-markdown` | Convert DOCX XML to Markdown |
| `gdocs-to-markdown` | Convert Google Docs format to Markdown |
| `notion-blocks-to-markdown` | Convert Notion block format to Markdown |
| `notion-status-map` | Map Notion status to canonical status enum |
| `preserve-markdown` | Pass through without modification |
| `excel-date-serial` | Convert Excel date serial to ISO 8601 |

## Error Handling

| Error Type | Default Behavior |
|------------|-----------------|
| Missing required field | Quarantine document |
| Invalid field type | Coerce where safe; quarantine if not |
| Unknown field | Ignore silently |
| Invalid encoding | Convert to UTF-8 |
| File too large | Reject with error |
| Schema validation failure | Log warning; quarantine if errors > 0 |

## Import Logs

All import operations are logged to `knowledge/logs/import.log`. Each entry includes:
- Timestamp
- Source file path
- Format detected
- Documents processed / quarantined / failed
- Validation errors

## Quarantine

Documents that fail validation are moved to `knowledge/quarantine/` with an error report file.
Quarantined documents can be corrected and re-imported.

