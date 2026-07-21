# Tools

This directory contains CLI tools and utilities for managing the Knowledge Cloud.

## Planned Tools

| Tool | Purpose | Status |
|------|---------|--------|
| `validate` | Validate documents against schemas | Planned |
| `import` | Import documents from supported formats | Planned |
| `export` | Export pack to ZIP archive | Planned |
| `checksum` | Compute and verify document checksums | Planned |
| `stats` | Rebuild statistics from pack contents | Planned |
| `index` | Rebuild document index | Planned |

## Usage (once implemented)

```bash
# Validate a single document
node tools/validate.js --schema schemas/faq.schema.json --file path/to/document.json

# Import a batch
node tools/import.js --format json --spec templates/import/json.spec.json --input ./batch/

# Rebuild statistics
node tools/stats.js --pack packs/demo-enterprise-v1
```

