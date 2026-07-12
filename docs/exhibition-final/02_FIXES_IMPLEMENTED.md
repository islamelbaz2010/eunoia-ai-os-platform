# FIXES IMPLEMENTED
**Session**: 2026-07-12 — Active Fixer Session  
**Rule**: If a fix is < 2 hours → implement it, commit it, test it.

---

## Summary

This session implemented 6 code fixes. All fixes passed 375/375 tests, TypeScript (0 errors), and lint (clean) before and after. Build remains clean at 24 routes.

No fix in this session broke any existing test. No new tests were needed because all changes were UI/copy corrections with no business logic mutations.

---

## Fix 1: FAQ Role Count — CREDIBILITY

**File**: `src/app/_landing/faq.tsx`  
**Type**: Copy correction  
**Time**: 5 min

**Old text**:
> "Eunoia AI OS has 9 role levels: Owner, Super Admin, Admin, Manager, Operator, Editor, Member, Viewer, and Guest."

**New text**:
> "Yes. Eunoia AI OS has four access levels: Owner (full control), Admin (can invite and manage team members), Member (standard operational access), and Viewer (read-only). Owners and Admins can invite, revoke, and change roles for any team member."

**Why this matters**: An investor or enterprise buyer who looks at roles and then cross-references with the code, dashboard settings, or documentation would find only 4 roles. The mismatch destroys trust. Verified against: `src/lib/types.ts` (MemberRole union), `src/lib/auth/authorization.ts` (hasRole hierarchy), `src/app/dashboard/settings/` (role UI).

---

## Fix 2: Pricing Page CSV Inconsistency — TRUST

**File**: `src/app/_landing/pricing.tsx`  
**Type**: Feature list correction  
**Time**: 5 min

**Change**: Added "CSV import & export" to the Starter plan features list.

**Why this matters**: The Pro plan listed "CSV import & export" as a differentiator. But `src/lib/stripe/plans.ts` shows `csvExport: true` and `csvImport: true` for Starter as well. The pricing page was selling Starter as having fewer features than the code actually delivers. This made Pro look better at Starter's expense — but it also means Starter customers would discover CSV features exist and feel they were misled about what the plan includes.

**Verification**: `plans.ts` — Starter has `csvExport: true, csvImport: true`. `src/app/api/crm/export/route.ts` — checks `checkCsvExportAllowed()` which allows Starter. `src/app/dashboard/crm/import/` — CSV import exists and works.

---

## Fix 3: Duplicate Export CSV in CRM Table — UX POLISH

**File**: `src/app/dashboard/crm/page.tsx`  
**Type**: UI cleanup  
**Time**: 5 min

**Change**: Removed the second "Export CSV" link that appeared inside the contact table header. The first one (in the page header navigation bar alongside Pipeline, Activities, Import) remains and has the `download` attribute.

**Why this matters**: Having the same action appear twice on the same page creates confusion. Which one works? Which is the real one? One had a `download` attribute; the other didn't. The header position is more discoverable and semantically correct.

---

## Fix 4: Knowledge Base Document Count — TRANSPARENCY

**File**: `src/app/dashboard/knowledge-base/page.tsx`  
**Type**: UI addition  
**Time**: 10 min

**Change**: Added a document count next to the "Title" column header. When the limit of 100 is reached, it shows "(showing first 100)" to make the truncation explicit.

**Why this matters**: A hotel with 150+ documents would upload them all, see only 100 listed, and think some were deleted or failed to save. The "(showing first 100)" indicator makes the limitation explicit and honest. This is especially important at the exhibition when demoing with a pre-loaded account.

---

## Fix 5: AI Chat Suggested Questions — DEMO QUALITY

**File**: `src/app/dashboard/assistant/chat.tsx`  
**Type**: UX enhancement  
**Time**: 20 min

**Change**: Added 4 clickable suggested question chips to the empty chat state. Clicking a chip pre-fills the input field without submitting.

**Questions added**:
- "What is the check-in procedure for VIP guests?"
- "What are the dietary options available on our menu?"
- "How do we handle a guest medical emergency?"
- "What documents do guests need for early check-in?"

**Why this matters**: The old empty state was a paragraph of gray text. Visitors standing at the exhibition booth don't know what to type. They stare at the empty chat box and wait for you to tell them what to ask. With suggested questions, they can click and immediately see the AI streaming a response — without you having to think of an example question on the spot.

**Implementation note**: Questions are static — they're not dynamic or AI-generated. The correct approach for a demo is to pre-populate with questions the demo KB documents can answer. Ensure your seeded demo account has documents that answer these four questions before the exhibition.

---

## Fix 6: Copy Button on AI Responses — UX

**File**: `src/app/dashboard/assistant/chat.tsx`  
**Type**: UX enhancement  
**Time**: 15 min

**Change**: Added a "Copy" button below each completed assistant message. Button shows "Copied!" for 2 seconds after clicking. Only visible after streaming completes (not during).

**Why this matters**: During the demo, a prospect may want to share the AI's answer with a colleague or include it in an evaluation document. Previously they would have to manually highlight and copy. The copy button makes this seamless and adds a professional touch that signals "this is a real product, not a demo."

---

## What Was NOT Fixed (and Why)

| Issue | Why Not Fixed |
|-------|--------------|
| Mobile dashboard navigation | > 2 hours; requires full drawer component + state management + responsive overhaul |
| RESEND_API_KEY not configured | Infrastructure, not code — Vercel dashboard action |
| Stripe env vars missing | Infrastructure, not code — Vercel dashboard action |
| Sentry DSN not configured | Infrastructure, not code — Vercel dashboard action |
| Chat history persistence | > 2 hours; requires new DB table + migration + full UI state rework |
| Dashboard JS aggregation | Code has comments acknowledging this; safe at early-stage traffic volume |
| CSP unsafe-inline removal | Risk: could break Next.js inline styles; needs testing across all pages; risk too high pre-exhibition |
| Social proof / testimonials | Content decision, not code |
| `unsafe-inline` in CSP | The risk of breaking the live production demo in 48 hours outweighs the marginal security gain |
| File upload for KB (PDF/Word) | > 2 hours; requires new parsing pipeline integration |

---

## Post-Fix Verification

```
Tests:      375/375 passing ✅
TypeScript: 0 errors ✅  
Lint:       Clean ✅
Build:      24 routes ✅
```
