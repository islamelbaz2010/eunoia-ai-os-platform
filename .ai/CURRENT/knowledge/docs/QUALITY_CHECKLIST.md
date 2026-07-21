# Quality Checklist

Use this checklist before publishing any document or importing any batch.

## Document-Level Checklist

### Required Fields
- [ ] `id` is a valid UUID v4
- [ ] `title` is descriptive (not a placeholder)
- [ ] `version` follows SemVer
- [ ] `language` is a valid BCP-47 code
- [ ] `country` is a valid ISO 3166-1 alpha-2 code
- [ ] `industry` matches the target industry
- [ ] `department` matches the target department
- [ ] `priority` is set appropriately (not defaulted to medium without thought)
- [ ] `owner` is a valid email or identifier
- [ ] `last_updated` is an accurate ISO 8601 timestamp

### Content Quality
- [ ] Title is unique within the department
- [ ] Content is industry-appropriate
- [ ] No placeholder text (e.g., no `[TODO]`, `[FILL IN]`, `Lorem ipsum`)
- [ ] No PII or real personal data
- [ ] No real company names used as examples
- [ ] Language matches the `language` field
- [ ] Tags are from the controlled vocabulary

### Schema Compliance
- [ ] Zero validation errors (from `validation.json`)
- [ ] Zero unknown fields
- [ ] All enum values are valid
- [ ] Nested objects follow their sub-schemas

### File Integrity
- [ ] Checksum is computed and stored
- [ ] File encoding is UTF-8
- [ ] No BOM in JSON files
- [ ] File path matches manifest entry

### Manifest Updated
- [ ] Document added to `manifest.json` in the correct department
- [ ] Checksum in manifest matches file checksum
- [ ] Content type in manifest is correct
- [ ] Schema ref in manifest is correct

## Batch Import Checklist

- [ ] Import spec file selected matches source format
- [ ] Field mappings verified against source data sample
- [ ] Test run completed on a 10-document sample before full import
- [ ] Validation pass rate > 95% on sample
- [ ] Error handling configured (quarantine path set)
- [ ] Import log path configured
- [ ] Dry-run completed successfully
- [ ] Full import completed
- [ ] Import log reviewed
- [ ] Quarantine folder reviewed and resolved
- [ ] Statistics updated
- [ ] Index rebuilt

## Schema Release Checklist

- [ ] New schema has `$schema` declaration
- [ ] All fields have `description`
- [ ] Required fields list is accurate
- [ ] Enums are complete and documented
- [ ] Pattern regexes are tested
- [ ] `additionalProperties: false` is set
- [ ] Schema version is incremented
- [ ] Migration script written (if MAJOR bump)
- [ ] Existing documents validated against new schema
- [ ] Schema added to `knowledge/schemas/` directory
- [ ] Global manifest updated
- [ ] Documentation updated

## Pack Release Checklist

- [ ] All 5 industries present
- [ ] All 13 departments present per industry
- [ ] All 6 framework files present per department (README, schema, metadata, manifest, example, validation)
- [ ] All 15 canonical schemas present in `knowledge/schemas/`
- [ ] All 8 import specs present in `knowledge/templates/import/`
- [ ] All 7 documentation files present in `knowledge/docs/`
- [ ] `knowledge/manifest.json` updated
- [ ] `knowledge/index.json` updated
- [ ] `knowledge/statistics.json` updated
- [ ] `knowledge/version.json` updated
- [ ] Pack manifest (`packs/demo-enterprise-v1/manifest.json`) updated

