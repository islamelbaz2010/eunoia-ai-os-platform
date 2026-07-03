# Knowledge Brain — Extraction Reference

## Entity Extraction

### Pattern-Based Entities

All patterns run on the NFC-normalised, whitespace-collapsed text. Matches are deduplicated by `(type, normalized_value)`.

| Entity Type | Pattern Approach | Confidence | Examples |
|------------|-----------------|-----------|---------|
| Email | RFC 5321 local@domain.tld regex | 0.99 | `hello@acme.com` |
| Website | https?://... URL regex | 0.99 | `https://acme.com/about` |
| Phone | ±country (3) (3) (4) digit patterns | 0.90 | `+1 555-123-4567`, `(555) 123 4567` |
| Company | Title-Case words + legal suffix | 0.85 | `Acme Solutions Ltd`, `TechVentures LLC` |
| Person | Two consecutive Title-Case words | 0.55 | `John Smith`, `Sarah Chen` |

**Person false-positive suppression**: `"New York"`, `"United Kingdom"`, `"Visual Studio"`, and 10 other common named-location / product phrases are on an explicit deny list.

**Company requirements**: the entity must end with a recognised legal suffix (`Ltd`, `LLC`, `LLP`, `Inc`, `Corp`, `GmbH`, `Pty`, `Limited`, `Incorporated`, `Corporation`, `Group`, `Holdings`, `International`, `Ventures`, `Studios`, `Solutions`, `Technologies`, `Services`, `Consulting`, `Agency`, `Partners`, `Associates`). Plain company names without a suffix are not extracted to avoid false positives.

### Dictionary-Based Entities

A curated map of ~60 Technology, Platform, and Tool names is matched against the lowercased document text using word-boundary detection. The map is deliberately narrow — only widely-recognised names with low ambiguity are included.

**Technologies**: react, next.js, typescript, javascript, python, node.js, postgresql, mongodb, redis, elasticsearch, openai, gpt-4, claude, anthropic, langchain, pinecone, weaviate, qdrant, aws, gcp, azure, docker, kubernetes, terraform, cloudflare, graphql, rest, websocket, mysql, sqlite, huggingface

**Platforms**: vercel, supabase, firebase, netlify, heroku, railway, shopify, wordpress, webflow, framer

**Tools**: github, gitlab, jira, notion, slack, figma, linear, hubspot, salesforce, zapier, make, airtable, stripe, twilio, sendgrid, resend

### Adding New Entity Types

1. Add the type string to `KnowledgeEntityType` in `types.ts`
2. Add a pattern to `PATTERN_RULES` in `extractors/entities.ts`, or add keywords to `TECHNOLOGY_TERMS`
3. Add tests in `knowledge.test.ts`

---

## Keyword Extraction

### Algorithm

1. **Tokenise** — lowercase, strip non-alphanumeric (except hyphens), split on whitespace, discard words ≤2 chars
2. **Remove stop words** — 80-word English stop word list (articles, prepositions, auxiliary verbs, pronouns)
3. **Frequency count** — across concatenated `(title × 2) + content` to weight title keywords higher
4. **Score** — `(frequency + min(length/12, 0.25)) × (2.5 if in title else 1.0)`
5. **Rank** — sort by score descending
6. **Primary** — top 10 tokens
7. **Secondary** — tokens 11–25
8. **Synonyms** — look up primary tokens against 17 business domain synonym groups

### Synonym Groups

| Canonical | Synonyms |
|-----------|---------|
| client | customer, account, buyer |
| contract | agreement, deal, engagement |
| meeting | call, discussion, session, sync |
| proposal | offer, bid, pitch, quote |
| invoice | bill, receipt |
| project | initiative, engagement |
| service | offering, solution |
| team | staff, crew, members |
| strategy | plan, approach, roadmap |
| goal | objective, target, outcome |
| report | summary, analysis, overview |
| process | workflow, procedure |
| launch | release, deploy, rollout |
| budget | cost, expense, spend |
| campaign | initiative, program, promotion |
| revenue | income, earnings, profit |
| partner | vendor, supplier, provider |

---

## Duplicate Detection

### Algorithm

`computeSimilarity(textA, textB) → 0–1`

1. Apply `normalizeForComparison()` to both strings (lowercase + punctuation stripped)
2. Tokenise into words with length > 2
3. Generate bigrams and trigrams from each token list
4. Compute Jaccard similarity for bigrams: `|A ∩ B| / |A ∪ B|`
5. Compute Jaccard similarity for trigrams
6. Weighted average: `bigram × 0.6 + trigram × 0.4`

Special case: if normalised strings are identical → return 1.0 immediately.

### Threshold Guidance

| Threshold | Meaning |
|-----------|---------|
| 1.0 | Exact match after normalisation |
| ≥ 0.9 | Almost certainly duplicate (only stop-word or trivial differences) |
| ≥ 0.8 | Near-duplicate (recommended default) |
| 0.6–0.8 | High similarity (same topic, different detail) |
| < 0.6 | Related but distinct |

---

## Scoring Reference

### Category Weights

| Category | Importance | Business Value | AI Usefulness |
|---------|------------|----------------|---------------|
| Sales | 0.95 | 0.95 | 0.75 |
| Invoices | 0.90 | 0.90 | 0.35 |
| Clients | 0.90 | 0.90 | 0.70 |
| Projects | 0.85 | 0.85 | 0.55 |
| Legal | 0.85 | 0.65 | 0.50 |
| Finance | 0.85 | 0.85 | 0.45 |
| Services | 0.75 | 0.70 | 0.85 |
| Marketing | 0.70 | 0.70 | 0.60 |
| Knowledge Base | 0.60 | 0.45 | 0.95 |
| Processes | 0.65 | 0.50 | 0.90 |
| General | 0.35 | 0.25 | 0.30 |

### Freshness Curve

```
Age        Score
≤ 7 days   1.00
≤ 30 days  0.90
≤ 90 days  0.75
≤ 180 days 0.60
≤ 365 days 0.40
> 365 days 0.20
```
