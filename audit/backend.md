# Backend Audit — Eunoia AI OS

---

## API Inventory

### Public (Unauthenticated)
| Endpoint | Method | Auth | Rate Limit | Production Ready |
|----------|--------|------|------------|-----------------|
| `GET /api/live` | GET | None | None | ✅ Yes |
| `GET /api/health` | GET | None | 30s cache | ✅ Yes |
| `GET /api/metrics` | GET | Bearer token (optional) | None | ⚠️ Open if METRICS_TOKEN not set |

### Protected (Supabase Session Required)
| Endpoint | Method | Auth | Rate Limit | Production Ready |
|----------|--------|------|------------|-----------------|
| `GET /api/admin/system` | GET | Supabase session | None | ✅ Yes |
| `POST /api/crm/import` | POST | Supabase session + org membership | None | ✅ Yes |
| `GET /api/crm/export` | GET | Supabase session + org membership | None | ✅ Yes |
| `POST /api/crm/insights` | POST | Supabase session + org membership | 10/hr/user | ✅ Yes |

### Auth Routes
| Endpoint | Method | Notes |
|----------|--------|-------|
| `GET /auth/callback` | GET | PKCE exchange, redirects to /dashboard |

---

## Server Actions Inventory

### crm/actions.ts (29 actions)
| Action | Guards | Audit | Status |
|--------|--------|-------|--------|
| createContact | verifySession + org | ✅ | ✅ |
| updateContact | verifySession + org | ✅ | ✅ |
| updateContactStage | verifySession + org | ✅ | ✅ |
| softDeleteContact | requireAdmin | ✅ | ✅ |
| restoreContact | requireAdmin | ✅ | ✅ |
| hardDeleteContact | requireAdmin | ✅ | ✅ |
| deleteContact | requireAdmin (alias) | ✅ | ✅ |
| archiveContact | verifySession + org | ✅ | ✅ |
| unarchiveContact | verifySession + org | ✅ | ✅ |
| createTag | verifySession + org | ✅ | ✅ |
| assignTag | verifySession + org | ✅ | ✅ |
| removeTag | verifySession + org | ✅ | ✅ |
| deleteTag | requireAdmin | ✅ | ✅ |
| createTimelineEvent | verifySession + org | ✅ | ✅ |
| deleteTimelineEvent | verifySession + org | ✅ | ✅ |
| createActivity | verifySession + org | ✅ | ✅ |
| completeActivity | verifySession + org | ✅ | ✅ |
| deleteActivity | verifySession + org | ✅ | ✅ |

### knowledge-base/actions.ts
| Action | Guards | Status |
|--------|--------|--------|
| createDocument | verifySession + org | ✅ |
| deleteDocument | verifySession + org (admin/owner/creator) | ✅ |
| updateDocument | **MISSING** | ❌ Not implemented |

### settings/actions.ts
| Action | Guards | Status |
|--------|--------|--------|
| createInvite | AuthorizationService.require(ORG_MEMBERS_INVITE) | ✅ |
| revokeInvite | AuthorizationService.require(ORG_INVITES_REVOKE) | ✅ |
| updateMemberRole | AuthorizationService.require(ORG_MEMBERS_ROLES) | ✅ |
| removeMember | AuthorizationService.require(ORG_MEMBERS_REMOVE) | ✅ |
| updateOrgSettings | AuthorizationService.require(ORG_SETTINGS_WRITE) | ✅ |

### assistant/actions.ts
| Action | Guards | Status |
|--------|--------|--------|
| askAssistant | verifySession + org + rate limit | ✅ |

### auth/actions.ts
| Action | Status |
|--------|--------|
| login | ✅ |
| signup | ✅ |
| logout | ✅ |
| requestPasswordReset | ✅ |
| updatePassword | ✅ |

---

## Code Quality — Server Actions

### ✅ Consistent Patterns
- All actions have `"use server"` directive
- Zod validation before all DB access
- Fire-and-forget audit/usage logging (`void logAuditEvent(...)`)
- Consistent `dbError()` helpers translating Postgres codes to user messages
- `revalidatePath()` called after mutations

### ⚠️ Issues Found

**deleteContact is a backward-compat alias** (low risk):
```ts
export async function deleteContact(contactId: string): Promise<void> {
  return softDeleteContact(contactId);
}
```
Old callers get soft-delete behavior even if they expect hard-delete. Document this or remove.

**updateContact duplicate detection only checks email, not name for edit:**
```ts
p_name: null,  // Name check disabled on update
```
By design — prevents false positives when editing. Acceptable.

**crm/actions.ts is 650+ lines** — should be split by domain (contacts, tags, timeline, activities). Not a bug, but a maintainability concern.

---

## AI Pipeline

### RAG Flow (Verified)
1. `verifySession()` → `getActiveOrganization()` → rate limit check
2. `embedText(question)` → OpenAI `text-embedding-3-small`
3. `match_kb_chunks` RPC → cosine similarity, top 6 results
4. Filter by `MIN_SIMILARITY = 0.3`
5. Build context string with source citations
6. `openai.chat.completions.create()` → `gpt-4o-mini`, max 1024 tokens
7. Return answer + sources

### Missing: Streaming
RAG responses block for 5–15 seconds (embedding + search + generation). No streaming implementation exists. The user sees "Thinking..." with no feedback.

### Missing: Chat History
Each page load starts a fresh conversation. No persistence.

### Missing: Re-ingestion
`updateDocument` action doesn't exist, so documents can't be corrected and re-embedded.

### OpenAI Constants (Verified)
- `EMBEDDING_MODEL = "text-embedding-3-small"` — cost-efficient ✅
- `CHAT_MODEL = "gpt-4o-mini"` — cost-efficient ✅
- Batch size: 512 (well under API limit of 2048) ✅
- Timeout: 30s, maxRetries: 2 ✅

---

## Health Framework

### Architecture (Verified)
- 3-tier: `/api/live` (liveness) → `/api/health` (readiness, 30s cache) → `/api/admin/system` (diagnostics, never cached)
- 8 providers: database, auth, storage, openai, email, cache, queue, environment
- `Promise.allSettled` with shared AbortController (5s timeout) ✅
- In-memory ring buffer (100 entries) for history ✅
- `safeCheck()` wrapper prevents any provider from crashing the check ✅

### ⚠️ Health Check Stubs
`cache.ts` and `queue.ts` providers return `"disabled"` — no actual Redis/queue infrastructure. This is correct for current architecture but the health dashboard will show them as "disabled" which may confuse operators.

---

## Backend Score: 80 / 100

Deductions:
- -8: No `updateDocument` action
- -6: No streaming RAG
- -4: No pagination on list endpoints
- -2: crm/actions.ts too long (maintainability)
