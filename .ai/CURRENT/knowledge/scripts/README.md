# Scripts

This directory contains automation scripts for Knowledge Cloud operations.

## Planned Scripts

| Script | Purpose | Status |
|--------|---------|--------|
| `seed.js` | Seed pack with generated content | Planned |
| `validate-all.js` | Validate all documents in a pack | Planned |
| `rebuild-index.js` | Rebuild `index.json` from pack contents | Planned |
| `rebuild-stats.js` | Rebuild `statistics.json` from pack contents | Planned |
| `compute-checksums.js` | Compute checksums for all files | Planned |
| `migrate.js` | Run schema migration scripts | Planned |
| `export-pack.js` | Export pack as signed ZIP archive | Planned |

## Naming Convention

```
{purpose}.js        ← one-shot script
{purpose}.sh        ← shell wrapper
migrations/
  {date}-{description}.js   ← schema migration
```

