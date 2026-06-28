# 12 — Testing

## Test Suite Overview

| Test type | Framework | Files | Coverage |
|-----------|-----------|-------|---------|
| Unit tests | Vitest v4 | `src/lib/**/*.test.ts` | Pure functions only |
| Integration | Node.js | `scripts/test-rag.js`, `scripts/test-openai.js` | RAG pipeline + Supabase |

---

## Unit Tests

### Run

```bash
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Configuration

**File**: `vitest.config.ts`
```typescript
{
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/*.test.ts"],
    }
  }
}
```

Path alias `@` → `src/` is configured for imports.

### Test Files

#### `src/lib/ai/chunk.test.ts` — `chunkText()` tests

| Test | What it verifies |
|------|----------------|
| Empty input | Returns `[]` for `""` and `"   "` |
| Short text | Single chunk returned unchanged |
| CRLF normalization | `\r\n` becomes `\n` |
| Multi-chunk with overlap | 1150-char text → 2 chunks (1000 + 300 with 150 overlap) |
| No empty chunks | Filter removes empty strings |
| Whitespace trimming | Leading/trailing whitespace stripped from chunks |

#### `src/lib/utils.test.ts` — `slugify()` tests

| Test | What it verifies |
|------|----------------|
| Basic slug | Lowercases + hyphenates words, adds 5-char suffix |
| Strips leading/trailing hyphens | `!!!Hello!!!` → `hello-XXXXX` |
| Fallback to `org` | All special chars → `org-XXXXX` |
| Truncation | Base truncated at 40 chars |
| Uniqueness | Two slugify calls produce different results (random suffix) |
| DB slug regex | Output matches `^[a-z0-9][a-z0-9-]*[a-z0-9]$` |

#### `src/lib/types.test.ts` — `hasRole()` + `ROLE_RANK` tests

| Test | What it verifies |
|------|----------------|
| Role rank order | viewer < member < admin < owner |
| `hasRole` matrix | All 16 combinations of 4 roles × 4 minimums |

---

## Integration Tests

These tests require real credentials in `.env.local`. They hit actual Supabase and OpenAI APIs.

### `node scripts/test-openai.js`

**Purpose**: Verify OpenAI API connectivity and embedding generation.  
**What it does**: Creates one embedding for "hello world" and verifies 1536 dimensions.  
**Requires**: `OPENAI_API_KEY` in `.env.local`

### `node scripts/test-rag.js`

**Purpose**: Full end-to-end RAG pipeline verification.  
**What it does**: 7-step test with complete cleanup:

| Step | Test |
|------|------|
| 1 | Supabase connectivity (ping organizations table) |
| 2 | Embedding generation (two hotel texts, 1536 dims) |
| 3 | Chunk insertion (into knowledge_base_chunks) |
| 4 | Vector search (cosine similarity via JS) |
| 4b | `match_kb_chunks` RPC reachability (expect 0 rows without auth session) |
| 5 | RAG end-to-end (embed → search → GPT-4o-mini answer) |
| 6 | Audit log insert + select |
| 7 | Usage event insert + select |

**Cleanup**: All test data is deleted in a `finally` block regardless of pass/fail.  
**Requires**: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`

---

## What is NOT Tested

- React components (no component tests)
- Server Actions (no integration tests for auth flow)
- End-to-end browser tests (no Playwright/Cypress)
- The proxy (no middleware tests)
- Database RLS policies (not tested in test suite)

---

## Adding Tests

New unit test files should be placed next to the source they test:
- `src/lib/ai/chunk.ts` → `src/lib/ai/chunk.test.ts`
- `src/lib/utils.ts` → `src/lib/utils.test.ts`

Use the Vitest API:
```typescript
import { describe, it, expect } from "vitest"
import { myFunction } from "./my-module"

describe("myFunction", () => {
  it("does X", () => {
    expect(myFunction("input")).toBe("expected")
  })
})
```

Vitest uses Node environment (`environment: "node"`) — no DOM APIs available. For React component tests, would need to add `@testing-library/react` and switch to `jsdom` environment.
