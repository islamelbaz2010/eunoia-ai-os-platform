# PROMPTS — Pre-Built Prompts for Common Tasks

**Paste directly into a Claude Code session.**

---

## Standard Session Start

```
Continue
```

That's it. CLAUDE.md handles the rest.

---

## Implementing a Specific Feature

```
Implement [FEATURE NAME].

Before coding:
1. Read all affected files
2. Check .claude/ACTIVE_TASKS.md for context
3. Follow the 10-step protocol in .claude/SESSION.md

After coding:
- Run: npx tsc --noEmit && npm run lint && npm test
- Update .claude/ACTIVE_TASKS.md
- Output EXECUTION REPORT
```

---

## Sentry Integration (Next P0 Task)

```
Add Sentry error monitoring to Eunoia AI OS.

Run: npx @sentry/wizard@latest -i nextjs

After the wizard:
1. The wizard will modify next.config.ts and create src/instrumentation.ts
2. Also update src/app/error.tsx to capture errors to Sentry
3. Verify the SENTRY_DSN env var is referenced in next.config.ts
4. Add SENTRY_DSN to .env.example

Do NOT change the existing error.tsx behavior of showing only error.digest (not error.message).
Just add Sentry.captureException(error) to the useEffect in error.tsx.

After implementing: npx tsc --noEmit && npm run lint && npm test
```

---

## CRM Edit Contact

```
Add inline contact editing to the CRM table.

The ContactRow component is at: src/app/dashboard/crm/contact-row.tsx
The CRM actions are at: src/app/dashboard/crm/actions.ts

1. Add updateContact(id, { status }) to actions.ts
   - verifySession() + getActiveOrganization()
   - hasRole(membership.role, "member") — members can update (not just admins)
   - Validate status with z.enum(["new","contacted","qualified","won","lost"])
   - UPDATE crm_contacts SET status WHERE id AND organization_id
   - void logAuditEvent(...)
   - revalidatePath("/dashboard/crm")

2. Update ContactRow to include a status dropdown
   - Follow the pattern from MemberRow (src/app/dashboard/settings/member-row.tsx)
   - Optimistic update: update UI immediately, revert on error
   - useTransition for pending state

Run: npx tsc --noEmit && npm run lint && npm test
```

---

## KB Edit Document + Re-ingest

```
Add document editing to the Knowledge Base.

Files to modify:
- src/app/dashboard/knowledge-base/actions.ts — add updateDocument(id, { title, content })
- src/app/dashboard/knowledge-base/document-row.tsx — add edit button that opens form

The updateDocument action must:
1. verifySession() + getActiveOrganization()
2. Check admin OR creator (same as deleteDocument)
3. Validate title (2-200 chars) + content (10-50000 chars)
4. UPDATE knowledge_base_documents SET title, content, status WHERE id AND organization_id
5. Re-run ingestDocument(id, orgId, newContent) to re-embed
   - ingestDocument already handles DELETE existing chunks + INSERT new ones (idempotent)
6. void logAuditEvent("kb_document.updated", ...)
7. revalidatePath("/dashboard/knowledge-base")

For the UI: add an "Edit" button that shows an inline form below the row,
similar to ContactForm but pre-populated. Keep it simple.

Run: npx tsc --noEmit && npm run lint && npm test
```

---

## Org Switcher

```
Implement organization switcher for users with multiple org memberships.

Current state: src/lib/auth/dal.ts:getActiveOrganization() returns memberships[0].
This is a known limitation (ADR in .claude/DECISIONS.md).

Implementation:
1. Add switchOrganization(orgId: string) server action in src/lib/auth/actions.ts
   - verifySession()
   - getMemberships() — verify caller is a member of the target org
   - Set cookie: cookies().set("active_org_id", orgId, { httpOnly: true, sameSite: "lax" })
   - revalidatePath("/dashboard")

2. Update getActiveOrganization() in src/lib/auth/dal.ts:
   - Read "active_org_id" from cookies
   - If set and matches one of the user's memberships, return that one
   - Otherwise fall back to memberships[0]

3. Create src/app/dashboard/org-switcher.tsx [CLIENT]:
   - Show current org name
   - Dropdown with all org memberships
   - On select: call switchOrganization() via useTransition
   - Only render if memberships.length > 1

4. Add OrgSwitcher to src/app/dashboard/layout.tsx

Remember: cookies() in Next.js 16 is called without await in Server Components
but may need await in Server Actions — check the actual API.

Run: npx tsc --noEmit && npm run lint && npm test
```

---

## Streaming RAG Responses

```
Replace the blocking askAssistant() call with streaming.

Current flow: Client calls askAssistant() server action → waits 5-8 seconds → gets complete answer.
Target flow: Client opens streaming route → tokens stream in real-time.

Steps:
1. Create src/app/api/assistant/stream/route.ts (new route handler)
   - POST handler: receive { question }
   - verifySession() + getActiveOrganization() — must work in route handler context
   - Rate limit check (same 50/hour logic as current)
   - embedText(question)
   - match_kb_chunks(...)
   - openai.chat.completions.stream({ ... }) — returns AsyncIterable
   - Return ReadableStream with text/event-stream content type

2. Update src/app/dashboard/assistant/chat.tsx [CLIENT]:
   - Replace startTransition(async () => await askAssistant()) with fetch to /api/assistant/stream
   - Use ReadableStream to append tokens as they arrive
   - Update message.content incrementally (useState)

3. Keep askAssistant() server action for non-streaming fallback.

Important: The route handler needs its own auth check — it cannot use the same
React.cache() as Server Actions because it runs in a different context.

Run: npx tsc --noEmit && npm run lint && npm test
```

---

## Stripe Billing

```
Add Stripe subscription billing to Eunoia AI OS.

Read first:
- .claude/DECISIONS.md (ADR on rate limiting + quota)
- src/app/dashboard/assistant/actions.ts (RAG_RATE_LIMIT_PER_HOUR)

Tiers:
- Starter: $99/month, 5 users, 100 RAG queries/month
- Professional: $299/month, 25 users, 1000 RAG queries/month  
- Enterprise: $499/month, unlimited users, unlimited queries

Steps:
1. npm install stripe @stripe/stripe-js
2. Add STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.example
3. Create src/lib/stripe.ts (import "server-only", Stripe singleton)
4. New migration: add stripe_customer_id + plan to organizations table
5. Create src/app/api/stripe/webhook/route.ts — handle checkout.session.completed, customer.subscription.updated
6. Create src/app/dashboard/billing/page.tsx — show current plan + upgrade options
7. Update askAssistant() to check monthly quota vs plan limit before rate limit check

Start with just the webhook handler and billing page. We'll wire quota after.

Run: npx tsc --noEmit && npm run lint && npm test
```

---

## Quick Cleanup Tasks (Batch)

```
Do these 4 quick cleanup tasks in one commit:

1. Delete: rm -rf src/app/api/status/
   (empty directory, no code, no routes)

2. Fix: package.json line 2: "name": "eunoia-ai-os-platform"
   (currently wrong: "eunoia-ai-os-app")

3. Remove: npm uninstall clsx
   (zero imports in source: grep -r "clsx" src/ → no results)

4. Delete: rm public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg
   (Create Next App scaffold, unreferenced)

Run: npx tsc --noEmit && npm run lint && npm test
Commit with: "Cleanup: remove dead code, fix package name, remove unused dep"
```

---

## Debug: Why Invite Emails Aren't Sending

```
Check this sequence:
1. Read src/lib/email.ts — verify Resend SDK is imported + getResendClient() exists
2. Check if RESEND_API_KEY is set: in Vercel dashboard → Environment Variables
3. Check Resend dashboard for delivery failures
4. Look at Vercel function logs for: "[email] RESEND_API_KEY not set" warning

If the key is missing: add RESEND_API_KEY to Vercel → redeploy.
If the key is set but emails fail: check FROM_EMAIL is a verified Resend domain.
```

---

## Investigate a Production Error

```
To investigate [ERROR DESCRIPTION]:

1. Check Vercel function logs:
   Vercel Dashboard → Logs → filter by timestamp of the error
   
2. Check Supabase logs:
   Supabase Dashboard → Database → Logs → PostgREST errors

3. Check health endpoint:
   curl https://eunoiaos.com/api/health

4. Read the relevant source file — trace the code path that would produce this error.

Do NOT guess. Read the code before proposing a fix.
```
