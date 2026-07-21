# Content Guidelines

## What This Pack Contains

The Demo Enterprise Pack v1 is a **framework shell**. It contains:

- ✅ Schema definitions
- ✅ Metadata templates
- ✅ Validation rules
- ✅ Example structures
- ✅ Import specifications
- ✅ Documentation

It does NOT contain:

- ❌ Business content
- ❌ Real company data
- ❌ Fake policies or FAQs
- ❌ Sample company names
- ❌ Invented procedures or SOPs

## Content Population Process

Content is added by **Gemini** or **authorized content teams** using the `example.json` files as generation templates.

### Step 1 — Select Industry and Department

Choose the target:
```
packs/demo-enterprise-v1/{industry}/{department}/
```

### Step 2 — Read the Schema

Review `schema.json` to understand required and optional fields.

### Step 3 — Use example.json as the Template

Pass `example.json` to Gemini with the generation prompt. The example defines the exact structure to populate.

### Step 4 — Validate Output

Run the output through `validation.json` rules before committing.

### Step 5 — Update Manifest

Add the new document to `manifest.json` with its path, checksum, and content type.

### Step 6 — Update Statistics

Run the statistics update script to refresh `knowledge/statistics.json`.

## Language and Localization

- Default language is `en` (English)
- Multi-language packs must create locale-specific subdirectories
- Language codes must follow BCP-47 (e.g., `en-US`, `ar-EG`)
- Country codes must follow ISO 3166-1 alpha-2

## Industry Accuracy

Content must accurately reflect the industry context:

| Industry | Key Terminology | Regulatory Context |
|----------|----------------|-------------------|
| Hotels | PMS, RevPAR, ADR, OTA, occupancy | PCI-DSS (payments), local hospitality law |
| Restaurants | POS, covers, COGS, mise en place | Food safety (HACCP, FDA), labor law |
| Medical Clinics | EMR, SOAP notes, CPT codes, prior auth | HIPAA, state medical board regulations |
| Real Estate | MLS, cap rate, escrow, comps | RESPA, fair housing, state RE law |
| Travel Agencies | GDS, IATA, booking class, PNR | IATA regulations, consumer protection law |

## Prohibited Content

Do not include:
- Personal names of real individuals
- Real company names as examples
- Real addresses or location data
- Real financial figures
- Medical advice
- Legal advice
- Content that could be mistaken for official company documents

## Review Process

Before publishing any document (`status: published`):
1. Schema validation — zero errors
2. Industry accuracy review
3. Legal/compliance review (for policies)
4. Owner approval
5. Version increment

