# 22 — Incident Response

## Severity Levels

| Level | Description | Response Time |
|-------|-------------|--------------|
| P1 | Complete outage (all users cannot log in) | Immediate |
| P2 | Feature broken (RAG down, KB unavailable) | < 1 hour |
| P3 | Performance degraded | < 4 hours |
| P4 | Minor bug, cosmetic issue | Next sprint |

---

## P1: Complete Outage

**Symptoms**: 
- `/api/health` returns 503
- Users see error page instead of login
- No page loads

**Diagnosis steps**:
1. Check Vercel dashboard → Deployments (look for failed deploy)
2. Check Vercel → Functions → Error logs
3. Check `GET /api/health` → look at `checks.db`
4. Check status.supabase.com
5. Check Vercel status page

**Resolution**:
- If recent bad deploy: rollback via Vercel dashboard → Deployments → Promote previous
- If Supabase down: wait for Supabase to recover (no action possible)
- If env var missing: add in Vercel dashboard → redeploy

---

## P2: RAG Assistant Down

**Symptoms**: "AI service is temporarily unavailable" in chat, or no response.

**Diagnosis**:
1. Check OpenAI status: status.openai.com
2. Check Vercel function logs for `[assistant]` prefix errors
3. Run: `node scripts/test-openai.js` (verifies OpenAI connectivity)
4. Check OpenAI billing — key may be over limit

**Resolution**:
- OpenAI rate limit: wait or increase API tier
- API key expired: regenerate at platform.openai.com → update Vercel env var → redeploy
- Timeout: if consistent, check if gpt-4o-mini is slow; consider reducing MAX_ANSWER_TOKENS

---

## P2: Knowledge Base Ingestion Failing

**Symptoms**: "Failed to index document for AI search" error.

**Diagnosis**:
1. Check Vercel function logs for `[ingest]` errors
2. Verify OpenAI API key and quota
3. Check Supabase → Table Editor → knowledge_base_chunks (any recent rows?)

**Resolution**:
- Usually OpenAI API issue (same as RAG Assistant Down)
- If Supabase issue: check `knowledge_base_chunks` table for correct schema (embedding NOT NULL)

---

## P2: Authentication Broken

**Symptoms**: Cannot log in; redirect loops; sessions not persisting.

**Diagnosis**:
1. Check Supabase → Authentication → Users (can you see users?)
2. Check Supabase → Auth settings → Site URL (must match production URL)
3. Check Supabase → Auth settings → Redirect URLs (must include `/auth/callback`)
4. Check proxy.ts is correctly deployed (check Vercel function logs)

**Resolution**:
- Wrong Site URL: update in Supabase Auth settings
- Missing redirect URL: add `https://eunoiaos.com/auth/callback` to allowed list
- Cookie issue: check that `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set in Vercel

---

## P3: Slow Performance

**Symptoms**: Pages take >5s to load.

**Diagnosis**:
1. Check Vercel function duration logs
2. Check Supabase dashboard → Database → Query performance
3. Look for missing indexes (check `pg_stat_user_indexes`)

**Common causes**:
- Missing indexes on frequently queried columns (should be mitigated by migrations 0004/0006)
- JavaScript aggregation on large datasets (usage page, dashboard charts)
- Cold start on first request after inactivity

**Resolution**:
- Dashboard/usage aggregation: implement SQL GROUP BY (see technical debt TD-004, TD-005)
- Slow queries: add index in Supabase SQL editor

---

## P4: Data Issue

**Symptoms**: Wrong data displayed, duplicate records, missing records.

**Diagnosis**:
1. Check Supabase → Table Editor → inspect the affected table
2. Check audit_logs for the organization to trace recent actions
3. Check for RLS policy issues (can query return wrong org's data? — should be impossible but verify)

**Resolution**:
- Corrupt data: fix directly in Supabase Table Editor or SQL
- RLS issue: review and update policies in migrations

---

## Communication Template

For user-facing incidents:

> **[Date] — Service Update**
> 
> We are aware of an issue affecting [feature]. Our team is investigating.
> 
> **Impact**: [describe what is affected]
> **Status**: [Investigating / Identified / Monitoring / Resolved]
> **ETA**: [time estimate or "No ETA yet"]
> 
> We will provide updates every [30 minutes / 1 hour].
