# Hotels / Templates

**Pack**: Demo Enterprise Pack v1 (`demo-enterprise-v1`)
**Industry**: Hotels (`hotels`)
**Department**: Templates (`templates`)
**Schema Type**: `template.schema.json`

## Purpose

Reusable document and communication templates

## Document Types

- `email`
- `sms`
- `letter`
- `contract`
- `report`

## Files in This Directory

| File | Purpose |
|------|---------|
| `schema.json` | JSON Schema for this department — extends `template.schema.json` |
| `metadata.json` | Metadata envelope for documents in this department |
| `manifest.json` | Pack manifest — lists all documents once populated |
| `example.json` | Empty example structure for AI content generation |
| `validation.json` | Validation rules applied on import and update |

## Schema Reference

The canonical schema for this department is `template.schema.json`, located at:
```
knowledge/schemas/template.schema.json
```

## Required Fields (all documents)

All documents in this department must include:
- `id` — UUID v4
- `title` — Document title
- `version` — Semantic version
- `language` — BCP-47 code (e.g., `en`, `ar`)
- `country` — ISO 3166-1 alpha-2 (e.g., `US`, `EG`)
- `industry` — Must be `hotels`
- `department` — Must be `templates`
- `priority` — One of: `critical`, `high`, `medium`, `low`
- `owner` — Email or identifier of document owner
- `last_updated` — ISO 8601 timestamp

## Content Population

This directory is a **framework shell**. Content is populated by Gemini or authorized content teams.
Do not add business content, fake data, or placeholder text to this directory.

See `knowledge/docs/CONTENT_GUIDELINES.md` for population instructions.

