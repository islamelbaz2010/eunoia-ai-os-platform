# Best Practices

## Schema Design

- **Prefer required over optional** — if a field is always meaningful, require it
- **Use enums for controlled vocabularies** — prevents inconsistent tagging
- **Add descriptions to every field** — schemas are documentation
- **Keep schemas flat** — max 3 levels of nesting before creating a reference type
- **Use `$ref`** — extend canonical schemas rather than duplicating fields
- **Always include `additionalProperties: false`** — prevents schema drift

## Document Quality

- **One document, one purpose** — do not combine FAQ + Policy in one document
- **Unique IDs everywhere** — always generate a fresh UUID v4
- **Accurate `last_updated`** — set on every write, not just creation
- **Meaningful titles** — avoid generic titles like "Document 1"
- **Consistent tagging** — use the controlled tag vocabulary from `taxonomy/`
- **Set priority correctly** — do not default everything to `medium`

## Import Pipeline

- **Validate before committing** — run validation before writing to the pack
- **Quarantine on failure** — never silently discard failed imports
- **Log everything** — every import run must produce a log entry
- **Idempotent imports** — re-running the same import must produce the same result
- **Checksum on write** — always compute and store SHA-256 after writing

## Schema Validation

- **Run validation on every write** — not just on import
- **Treat errors as blocking** — zero errors before a document can be published
- **Warnings are not errors** — log and review, but do not block
- **Validate language codes** — BCP-47 only
- **Validate country codes** — ISO 3166-1 alpha-2 only

## Content Population (for Gemini and content teams)

- **Use `example.json` as the template** — do not improvise structure
- **Populate one department at a time** — validate before moving to next
- **Match the industry context** — language, terminology, and examples must fit the industry
- **Set `status: draft`** first — promote to `review` → `approved` → `published`
- **Never populate `checksum`** manually — let the pipeline compute it

## Security

- **No PII in schemas** — schemas define structure, not content
- **No credentials in manifests** — manifests are version-controlled
- **Sanitize imported content** — strip scripts, embedded objects
- **Audit all imports** — log who imported what and when

## Performance

- **Batch imports** — process in chunks of 100 documents
- **Lazy-load large packs** — do not load all documents into memory at once
- **Index on department+industry** — primary query pattern
- **Pre-compute checksums** — do not recompute on every read

