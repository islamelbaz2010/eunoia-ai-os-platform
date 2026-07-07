# Recommended Roadmap — Eunoia AI OS

---

## Immediate (This Week) — Unblock CI/CD

**Goal**: Restore build, lint, CI to green. Nothing else matters until this is done.

| # | Task | File | Effort | Owner |
|---|------|------|--------|-------|
| 1 | Fix TypeScript error: add `FileMetadata` import | `scripts/knowledge/quality-report.ts:58` | 1 min | Dev |
| 2 | Fix lint: unused vars + `any` types | `watch-assets.ts`, `parser/index.ts`, `validator/index.ts` | 30 min | Dev |
| 3 | Fix Dockerfile healthcheck string | `Dockerfile:84` | 1 min | Dev |
| 4 | Add `output: "standalone"` to next.config.ts | `next.config.ts` | 5 min | Dev |
| 5 | Archive orphan migration files | `supabase/migrations/` | 10 min | DBA |
| 6 | Update CURRENT_STATE.md + CI release summary | `.claude/`, `.github/` | 20 min | Dev |

**Total: ~70 minutes of actual work**

---

## Sprint 2 (Next 2 Weeks) — Revenue Foundation

**Goal**: Enable money collection.

| Priority | Feature | Effort | Notes |
|----------|---------|--------|-------|
| P0 | Stripe integration (checkout + webhooks) | 3 days | Vercel Marketplace integration |
| P0 | Subscription plan enforcement | 1 day | Check tier on feature access |
| P0 | Usage quota enforcement | 4 hours | Block RAG when quota exceeded |
| P0 | Set Vercel env vars (Resend, Sentry, Metrics) | 30 min manual | Ops task |
| P0 | Apply pending migrations (0007, 0008, 0009_fixed, 0010_fixed) | 30 min manual | DBA task |
| P1 | KB: Edit document + re-ingest | 6 hours | High user value |
| P1 | Streaming RAG responses | 1 day | Critical UX |
| P1 | Pagination (CRM, KB, audit) | 1 day | Scale blocker |

---

## Sprint 3 (Weeks 3–4) — Polish & Scale

| Priority | Feature | Effort | Notes |
|----------|---------|--------|-------|
| P1 | Chat history persistence | 2 days | New DB table |
| P1 | KB: File upload (PDF/DOCX) | 1 day | Vercel Blob + parse pipeline |
| P1 | Wire org AI settings to RAG | 4 hours | System prompt prefix, similarity |
| P2 | Profile management page | 4 hours | Avatar, display name |
| P2 | PWA icons + branded favicon | 2 hours | Design task |
| P2 | SQL aggregation for dashboards | 2 hours | Replace JS aggregation |
| P2 | Missing compound DB indexes | 2 hours | Performance |
| P2 | Mobile navigation (hamburger menu) | 4 hours | Mobile UX |
| P2 | Remove .DS_Store from git | 5 min | Cleanup |

---

## Sprint 4 (Month 2) — Enterprise Features

| Priority | Feature | Effort | Notes |
|----------|---------|--------|-------|
| P2 | Deal value tracking in CRM | 2 days | Pipeline value metric |
| P2 | Contact email sending (via Resend) | 1 day | CRM action → email |
| P2 | Bulk contact actions | 1 day | Select + bulk delete/archive |
| P2 | Redis-backed rate limiting | 4 hours | Replace DB count approach |
| P3 | SSO / SAML | 1 week | Enterprise requirement |
| P3 | 2FA | 2 days | Supabase feature |
| P3 | Multi-region deployment | 1 week | Latency for MENA users |

---

## Priority Matrix

```
HIGH IMPACT, LOW EFFORT (Do First):
  - Fix build (1 hour total)
  - Set Vercel env vars (30 min)
  - Apply migrations (30 min)

HIGH IMPACT, HIGH EFFORT (Plan):
  - Stripe billing
  - Streaming RAG
  - KB edit + re-ingest
  - Pagination

LOW IMPACT, LOW EFFORT (Fill Sprint):
  - PWA icons
  - .DS_Store cleanup
  - Orphan migration archive
  - Stale docs update

LOW IMPACT, HIGH EFFORT (Defer):
  - SSO/SAML
  - Multi-region
```

---

## What's Required to Reach Production-Ready (87→100)

1. ✅ Fix build (P0)
2. ✅ Fix lint (P0)  
3. ✅ Set all required Vercel env vars (P0)
4. ✅ Apply pending migrations (P0)
5. ✅ Fix Docker deployment (P0)
6. ✅ Stripe billing + quota enforcement (P0 business)
7. ✅ KB edit + re-ingest (P1)
8. ✅ Streaming RAG (P1)
9. ✅ Pagination (P2)
10. ✅ PWA icons (P3)

---

## Monetization Path

**Proposed Tiers** (from docs):
- Starter: $99/month — 5 users, 1000 RAG queries, 500 contacts
- Pro: $299/month — 25 users, 5000 RAG queries, unlimited contacts
- Enterprise: $499/month — unlimited users, custom limits

**Technical Requirements**:
1. Stripe integration (price IDs, checkout session, customer portal)
2. Stripe webhook handler (subscription.created, invoice.paid, customer.subscription.deleted)
3. `organizations.subscription_tier` already exists in schema ✅
4. Quota check in `askAssistant()` before rate limit check
5. Usage quota display on Usage page

**Estimated Time to First Revenue**: 3–5 days of engineering work after Stripe account setup
