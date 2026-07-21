# Contracts

This directory contains API contract definitions for the Knowledge Cloud API.

## Planned Contracts

| Contract | Format | Status |
|----------|--------|--------|
| Knowledge Cloud REST API | OpenAPI 3.1 | Planned |
| Import Webhook | OpenAPI 3.1 | Planned |
| Embedding Pipeline | OpenAPI 3.1 | Planned |
| Pack Registry | OpenAPI 3.1 | Planned |

## Naming Convention

```
{service}-api-{version}.openapi.yaml
```

Examples:
- `knowledge-api-v1.openapi.yaml`
- `import-webhook-v1.openapi.yaml`

## Usage

Contracts are used to:
1. Generate client SDKs (TypeScript, Python)
2. Validate API requests and responses
3. Document integration points for Gemini and other consumers
4. Drive mock servers for testing

