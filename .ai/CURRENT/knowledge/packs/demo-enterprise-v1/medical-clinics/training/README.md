# Medical Clinics / Training

**Pack**: Demo Enterprise Pack v1 (`demo-enterprise-v1`)
**Industry**: Medical Clinics (`medical-clinics`)
**Department**: Training (`training`)
**Schema Type**: `document.schema.json`

## Purpose

Staff training materials, onboarding guides, and skill development resources

## Document Types

- `module`
- `quiz`
- `onboarding-plan`
- `competency-map`

## Files in This Directory

| File | Purpose |
|------|---------|
| `schema.json` | JSON Schema for this department — extends `document.schema.json` |
| `metadata.json` | Metadata envelope for documents in this department |
| `manifest.json` | Pack manifest — lists all documents once populated |
| `example.json` | Empty example structure for AI content generation |
| `validation.json` | Validation rules applied on import and update |

## Schema Reference

The canonical schema for this department is `document.schema.json`, located at:
```
knowledge/schemas/document.schema.json
```

## Required Fields (all documents)

All documents in this department must include:
- `id` — UUID v4
- `title` — Document title
- `version` — Semantic version
- `language` — BCP-47 code (e.g., `en`, `ar`)
- `country` — ISO 3166-1 alpha-2 (e.g., `US`, `EG`)
- `industry` — Must be `medical-clinics`
- `department` — Must be `training`
- `priority` — One of: `critical`, `high`, `medium`, `low`
- `owner` — Email or identifier of document owner
- `last_updated` — ISO 8601 timestamp

## Content Population

This directory is a **framework shell**. Content is populated by Gemini or authorized content teams.
Do not add business content, fake data, or placeholder text to this directory.

See `knowledge/docs/CONTENT_GUIDELINES.md` for population instructions.

