# Versioning

## Schema Versioning

All schemas use Semantic Versioning (SemVer): `MAJOR.MINOR.PATCH`

| Change Type | Version Bump |
|-------------|-------------|
| Breaking field removal or type change | MAJOR |
| New required field | MAJOR |
| New optional field | MINOR |
| Bug fix in validation rule | PATCH |
| Documentation update | PATCH |

## Document Versioning

Every document has a `version` field (SemVer):

| Change Type | Version Bump |
|-------------|-------------|
| Structural change to content | MAJOR |
| Significant content update | MINOR |
| Minor correction, typo fix | PATCH |

## Pack Versioning

Packs are versioned independently of schemas:
```
packs/demo-enterprise-v1/       ← pack version in folder name
    manifest.json               ← pack_version field
```

## Version Lock

When a document is published (`status: published`), its version is locked.
Changes require a version increment — never edit a published document in place.

## Version History

Version history is tracked in:
- `knowledge/version.json` — global changelog
- Each `manifest.json` — pack-level changelog
- Individual document `version` field — document-level

## Compatibility Matrix

| Consumer Version | Minimum Pack Version | Maximum Pack Version |
|-----------------|---------------------|---------------------|
| 1.0 | 1.0 | 1.9 |

The `compatibility` block in each manifest defines the range:
```json
{
  "compatibility": {
    "minimum": "1.0",
    "maximum": "1.9"
  }
}
```

## Migration

When a schema has a MAJOR version bump:
1. Create new schema file with new version in filename (e.g., `faq.schema.v2.json`)
2. Create migration script in `knowledge/scripts/migrations/`
3. Update all existing documents in a migration run
4. Deprecate old schema version (keep for 90 days)
5. Remove old schema version after deprecation period

