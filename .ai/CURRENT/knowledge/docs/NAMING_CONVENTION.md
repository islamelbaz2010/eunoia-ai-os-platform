# Naming Convention

## Principles

1. **Lowercase only** — all file and directory names use lowercase
2. **Hyphens for spaces** — use `-` not `_` or spaces in names
3. **Descriptive over short** — prefer clarity
4. **No special characters** — only `a-z`, `0-9`, `-`, `.!`

## Directory Names

| Context | Convention | Examples |
|---------|------------|---------|
| Industry | `{industry-id}` | `hotels`, `medical-clinics`, `real-estate` |
| Department | `{department-id}` | `operations`, `sales`, `playbooks` |
| Pack | `{pack-id}-{version}` | `demo-enterprise-v1` |

## File Names

### Schema Files
```
{schema-type}.schema.json
```
Examples: `document.schema.json`, `faq.schema.json`, `kpi.schema.json`

### Import Spec Files
```
{format}.spec.json
```
Examples: `json.spec.json`, `notion.spec.json`, `gdocs.spec.json`

### Document Files
```
{document-type}-{slug}-{uuid-prefix}.{ext}
```
Examples:
- `policy-cancellation-a1b2c3d4.md`
- `playbook-check-in-e5f6g7h8.json`
- `faq-room-upgrade-i9j0k1l2.md`

### Template Files
```
{template-type}-{slug}.{ext}
```
Examples: `email-booking-confirmation.md`, `sms-appointment-reminder.md`

### Prompt Files
```
prompt-{purpose}-{version}.json
```
Examples: `prompt-room-recommendation-v1.json`, `prompt-complaint-resolution-v2.json`

## Field Naming (JSON)

- All fields: `snake_case`
- Identifiers: `{entity}_id` suffix (e.g., `campaign_id`, `policy_id`)
- Timestamps: `{event}_at` suffix (e.g., `created_at`, `last_updated`)
- Booleans: verb prefix (e.g., `is_active`, `has_signature`, `requires_approval`)
- Arrays: plural noun (e.g., `tags`, `steps`, `items`)

## ID Format

All document IDs must be UUID v4:
```
xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
```

## Version Format

All versions follow semantic versioning:
```
MAJOR.MINOR.PATCH
```

## Language Codes

Use BCP-47: `en`, `ar`, `en-US`, `ar-EG`, `fr`, `fr-FR`, `es`, `de`

## Country Codes

Use ISO 3166-1 alpha-2: `US`, `EG`, `AE`, `GB`, `FR`, `SA`, `QA`

