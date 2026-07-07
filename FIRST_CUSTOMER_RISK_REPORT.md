# FIRST CUSTOMER RISK REPORT
**Repository**: eunoia-ai-os-platform  
**Date**: 2026-07-07  
**Risk Owner**: CTO  

---

## RISK SUMMARY

| Risk Category | Count | Severity |
|---------------|-------|----------|
| Revenue / Commercial | 4 | CRITICAL |
| Technical / Infrastructure | 6 | HIGH |
| Security | 5 | HIGH |
| Legal / Compliance | 4 | HIGH |
| Operational | 3 | MEDIUM |
| Reputational | 2 | MEDIUM |

---

## CRITICAL RISKS

### RISK-01: No Payment Infrastructure
**Probability**: Certain  
**Impact**: Zero revenue  
**Status**: OPEN — Stripe not installed  
**Evidence**: No `stripe` in `package.json`, no `billing/` route, no webhook handler  
**Mitigation**: Build Stripe integration (P0-1 in sprint)  
**Residual risk after fix**: Low  
**Owner**: Engineering  
**Deadline**: Before Customer #1 call  

### RISK-02: Customer Cannot Trust Without Legal Pages
**Probability**: Certain  
**Impact**: No contract possible; enterprise prospects will not sign  
**Status**: OPEN — no `/terms` or `/privacy` routes exist  
**Evidence**: `src/app/` has no `terms/` or `privacy/` directories  
**Mitigation**: Create ToS and Privacy Policy pages (P0-3 in sprint)  
**Residual risk after fix**: Low  
**Owner**: Engineering + Legal  
**Deadline**: Before Customer #1 call  

### RISK-03: Invite Emails Silently Failing in Production
**Probability**: Certain (RESEND_API_KEY not set in Vercel)  
**Impact**: Team collaboration broken; customers cannot invite colleagues  
**Status**: OPEN — env var confirmed missing  
**Evidence**: `CURRENT_STATE.md`: "RESEND_API_KEY ❌ missing"  
**Mitigation**: Set env var in Vercel (5 minutes)  
**Residual risk after fix**: Low  
**Owner**: Operations  
**Deadline**: Immediate  

### RISK-04: Prometheus Metrics Endpoint Open to Internet
**Probability**: Certain (METRICS_TOKEN not set)  
**Impact**: Memory stats, health data, app metadata exposed publicly  
**Status**: OPEN — confirmed missing  
**Evidence**: `CURRENT_STATE.md`: "Without this, /api/metrics is open"  
**Mitigation**: Set METRICS_TOKEN in Vercel (5 minutes)  
**Residual risk after fix**: Low  
**Owner**: Operations  
**Deadline**: Immediate  

---

## HIGH RISKS

### RISK-05: Database Migrations Not Applied
**Probability**: Certain  
**Impact**: Usage page fails; health check function missing; enterprise features broken  
**Status**: OPEN  
**Evidence**: `ACTIVE_TASKS.md`: migrations 0007, 0008, 0009 confirmed not applied  
**Mitigation**: Apply in Supabase SQL Editor (20 minutes)  
**Residual risk after fix**: Low  
**Owner**: Operations  
**Deadline**: Immediate  

### RISK-06: Migrations 0003-0006 Not Committed to Git
**Probability**: Certain  
**Impact**: If Supabase instance is rebuilt or migrated, critical schema policies are lost  
**Status**: OPEN  
**Evidence**: `CURRENT_STATE.md`: "⚠️ untracked / ❓ unknown"  
**Mitigation**: `git add supabase/migrations/0003*.sql ... && git commit`  
**Residual risk after fix**: Low  
**Owner**: Engineering  
**Deadline**: Immediate  

### RISK-07: No Error Visibility in Production
**Probability**: Certain (Sentry DSN not set)  
**Impact**: Bugs affecting customers go undetected; no stack traces; support is blind  
**Status**: OPEN  
**Evidence**: `CURRENT_STATE.md`: "SENTRY_DSN ❌ missing"  
**Mitigation**: Set SENTRY_DSN in Vercel (5 minutes after getting key from sentry.io)  
**Residual risk after fix**: Low  
**Owner**: Operations  
**Deadline**: Immediate  

### RISK-08: Signup May Bypass Email Verification
**Probability**: Likely (depends on Supabase project settings)  
**Impact**: Bots/spam accounts; unverified users access the product  
**Status**: OPEN — code does `redirect("/dashboard")` immediately after `signUp()`  
**Evidence**: `src/lib/auth/actions.ts:67`  
**Mitigation**: Check Supabase Auth settings; add email confirmation gate before redirect  
**Residual risk after fix**: Low  
**Owner**: Engineering  
**Deadline**: Before Customer #1 data is at risk  

### RISK-09: RAG Blocking Call Kills Demo
**Probability**: Certain  
**Impact**: 5–6 second freeze with "Thinking..." kills live demos; prospects disengage  
**Status**: OPEN — synchronous completions call confirmed  
**Evidence**: `src/app/dashboard/assistant/actions.ts:109`  
**Mitigation**: Implement streaming route handler (P1-2 in sprint)  
**Residual risk after fix**: Low  
**Owner**: Engineering  
**Deadline**: Before first prospect demo  

### RISK-10: No Backups Verified
**Probability**: Unknown  
**Impact**: Data loss event with no recovery path  
**Status**: UNKNOWN — Supabase backup tier not confirmed  
**Evidence**: No backup verification in runbooks  
**Mitigation**: Verify Supabase plan has PITR; test restore procedure  
**Residual risk after fix**: Medium  
**Owner**: Operations  
**Deadline**: Before customer data stored  

---

## MEDIUM RISKS

### RISK-11: FROM_EMAIL Uses Unverified Domain
**Probability**: Likely  
**Impact**: Invite emails land in spam; customers miss invites  
**Status**: OPEN — confirmed missing  
**Evidence**: `email.ts:34`: falls back to `noreply@eunoiaos.com`; domain verification unknown  
**Mitigation**: Verify sending domain DNS records in Resend  
**Owner**: Operations  
**Deadline**: With RESEND_API_KEY setup  

### RISK-12: No Rate Limiting on Login/Signup
**Probability**: Low  
**Impact**: Credential stuffing attacks; account enumeration  
**Status**: OPEN  
**Evidence**: `src/lib/auth/actions.ts`: no rate limiting beyond Supabase defaults  
**Mitigation**: Supabase Auth has built-in rate limits; verify they are enabled  
**Owner**: Security  
**Deadline**: P2  

### RISK-13: RAG Chunk Orphaning After Document Delete
**Probability**: Medium  
**Impact**: AI returns answers from deleted documents (stale context)  
**Status**: OPEN  
**Evidence**: `knowledge-base/actions.ts:111`: deletes from `knowledge_base_documents` — cascade to `kb_chunks` depends on FK setup  
**Mitigation**: Verify `ON DELETE CASCADE` on FK from `kb_chunks` to `knowledge_base_documents`  
**Owner**: Engineering  
**Deadline**: P1  

### RISK-14: No Disaster Recovery Test
**Probability**: Low  
**Impact**: When an incident occurs, untested recovery fails under pressure  
**Status**: OPEN  
**Evidence**: Runbooks written but never run  
**Mitigation**: Schedule a recovery drill before first customer data  
**Owner**: Operations  
**Deadline**: Before first enterprise customer  

### RISK-15: Landing Page Does Not Convert
**Probability**: Certain (current state)  
**Impact**: Prospects who visit the site see an empty screen with two login buttons  
**Status**: OPEN  
**Evidence**: `src/app/page.tsx`: 32 lines, no copy, no pricing  
**Mitigation**: Full landing page rewrite (P0-2 in sprint)  
**Owner**: Engineering  
**Deadline**: Before any marketing activity  

---

## RISK REGISTER SUMMARY

| Risk | Severity | Probability | Effort to Close | Status |
|------|----------|-------------|-----------------|--------|
| RISK-01: No Billing | CRITICAL | Certain | 3 days | Open |
| RISK-02: No Legal Pages | CRITICAL | Certain | 4 hours | Open |
| RISK-03: Invite Emails Broken | CRITICAL | Certain | 5 min | Open |
| RISK-04: Metrics Endpoint Open | CRITICAL | Certain | 5 min | Open |
| RISK-05: Migrations Not Applied | HIGH | Certain | 20 min | Open |
| RISK-06: Migrations Not in Git | HIGH | Certain | 30 min | Open |
| RISK-07: No Error Visibility | HIGH | Certain | 5 min | Open |
| RISK-08: Email Verification Bypass | HIGH | Likely | 2 hours | Open |
| RISK-09: RAG Blocks Demo | HIGH | Certain | 8 hours | Open |
| RISK-10: No Backups Verified | HIGH | Unknown | 2 hours | Unknown |
| RISK-11: Email Spam Risk | MEDIUM | Likely | 30 min | Open |
| RISK-12: No Auth Rate Limiting | MEDIUM | Low | 2 hours | Open |
| RISK-13: Stale RAG Chunks | MEDIUM | Medium | 1 hour | Open |
| RISK-14: No DR Test | MEDIUM | Low | 4 hours | Open |
| RISK-15: Landing Page Won't Convert | MEDIUM | Certain | 8 hours | Open |

---

## GO / NO-GO GATE

**Current status**: NO GO  
**Risks that must close before GO**: RISK-01, 02, 03, 04, 05, 06, 07  
**Estimated time to close all 7**: 2 days engineering + 1 hour manual ops  
**Remaining risks after sprint (acceptable)**: RISK-08, 09, 11, 12, 13, 14, 15
