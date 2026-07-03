# CRM Manual QA Matrix — Sprint 1

**Version**: 1.0  
**Sprint**: 1 (Sessions 13–14)  
**Precondition**: `0010_crm_platform_fixed.sql` applied, `npm run verify-crm` → 0 failures  
**App URL**: https://eunoia-ai-os-platform.vercel.app  
**Tester**: ________________  
**Date**: ________________

---

## Legend

| Symbol | Meaning |
|--------|---------|
| `[ ]` | Not tested yet |
| `[P]` | PASS |
| `[F]` | FAIL — note the actual result beside it |
| `[S]` | SKIP — with reason |

---

## 1. Contact CRUD

### 1.1 Create Contact (basic)

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 1 | Navigate to `/dashboard/crm` | Page loads, no errors | `[ ]` |
| 2 | Click **Add contact** | Form expands inline | `[ ]` |
| 3 | Fill only `Full name` → Submit | Contact appears in list with `lead` stage badge | `[ ]` |
| 4 | Click **Add contact** again → fill name + email + phone + company | All fields shown in contact detail | `[ ]` |
| 5 | Fill `Pipeline stage = qualified` | Contact shows `qualified` badge in list | `[ ]` |

### 1.2 Duplicate Detection

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 6 | Submit a contact with same email as an existing contact | "Possible duplicate" warning shown below form | `[ ]` |
| 7 | Warning shows existing contact name and email | Correct duplicate contact listed | `[ ]` |
| 8 | Click **Add anyway** | Contact created despite warning | `[ ]` |
| 9 | Submit contact with same name (different email) | Duplicate warning shown | `[ ]` |

### 1.3 Edit Contact

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 10 | Open contact detail → Click **Edit** | Edit modal opens with all fields populated | `[ ]` |
| 11 | Change `Full name` → Save | Header updates immediately, new name shows | `[ ]` |
| 12 | Change `Pipeline stage` → Save | Stage badge updates | `[ ]` |
| 13 | Change `Status` (new/contacted/qualified/won/lost) → Save | Status badge updates | `[ ]` |
| 14 | Add `Website` and `LinkedIn URL` → Save | Fields appear in contact detail | `[ ]` |
| 15 | Clear `Email` → Save | Email field shows empty; no error | `[ ]` |

### 1.4 Soft Delete / Restore

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 16 | Click **Delete** on a contact row | Confirmation prompt or immediate removal from active list | `[ ]` |
| 17 | Click **Deleted** tab | Previously deleted contact appears | `[ ]` |
| 18 | Click **Restore** on deleted contact | Contact moves back to **Active** tab | `[ ]` |

### 1.5 Archive / Unarchive

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 19 | Click **Archive** on contact | Contact disappears from active list | `[ ]` |
| 20 | Click **Archived** tab | Archived contact appears | `[ ]` |
| 21 | Click **Unarchive** | Contact returns to **Active** tab | `[ ]` |

### 1.6 Hard Delete

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 22 | Navigate to **Deleted** tab → click **Delete forever** | Contact no longer appears in any tab | `[ ]` |
| 23 | Refresh page | Contact still absent (DB confirmed) | `[ ]` |

---

## 2. Search

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 24 | Type in search bar | Results update after ~300ms (debounce visible) | `[ ]` |
| 25 | Search by partial name (first 3 chars) | Matching contacts returned | `[ ]` |
| 26 | Search by email address | Contact found | `[ ]` |
| 27 | Search by company name | Contacts from that company returned | `[ ]` |
| 28 | Search by phone number | Contact found | `[ ]` |
| 29 | Type nonexistent string | Empty state shown ("No contacts found") | `[ ]` |
| 30 | Clear search | Full list restored | `[ ]` |
| 31 | Type search → reload page | URL contains `?q=...`, same results shown | `[ ]` |
| 32 | Search in **Archived** tab | Searches within archived contacts only | `[ ]` |

---

## 3. Filters

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 33 | Click **Lead** filter chip | Only `lead` stage contacts shown | `[ ]` |
| 34 | Click **Qualified** filter chip | Only `qualified` stage contacts shown | `[ ]` |
| 35 | Click **Proposal** filter chip | Only `proposal` stage contacts shown | `[ ]` |
| 36 | Click **Negotiation** filter chip | Only `negotiation` stage contacts shown | `[ ]` |
| 37 | Click **Won** filter chip | Only `won` stage contacts shown | `[ ]` |
| 38 | Click **Lost** filter chip | Only `lost` stage contacts shown | `[ ]` |
| 39 | Click active filter again | Filter cleared, all contacts shown | `[ ]` |
| 40 | Combine search + stage filter | Intersection returned (e.g., "Acme" leads only) | `[ ]` |
| 41 | Filter persists after reload | URL contains `?stage=qualified`, same results | `[ ]` |

---

## 4. Tags

### 4.1 Create Tag

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 42 | Open contact detail → Tags section → Click **New tag** | Color picker + name input appear | `[ ]` |
| 43 | Set name + pick hex color → Save | Tag appears in tag pool with correct color | `[ ]` |
| 44 | Try to create duplicate tag name (same org) | Error: tag name already exists | `[ ]` |

### 4.2 Assign / Remove Tag

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 45 | Click existing tag in tag pool → assign to contact | Colored badge appears on contact | `[ ]` |
| 46 | Click same tag again | Tag removed from contact | `[ ]` |
| 47 | Assign 3 tags to same contact | All 3 badges shown | `[ ]` |
| 48 | Reload contact page | Tags persist | `[ ]` |
| 49 | Hard-delete a contact with tags | Tags remain in tag pool (contact_tags row cascade-deleted) | `[ ]` |

---

## 5. Pipeline Board

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 50 | Navigate to `/dashboard/crm/pipeline` | 6 columns: Lead, Qualified, Proposal, Negotiation, Won, Lost | `[ ]` |
| 51 | Contacts appear in correct columns | Match their `pipeline_stage` value | `[ ]` |
| 52 | Drag a card from **Lead** to **Qualified** | Card animates to Qualified column | `[ ]` |
| 53 | Reload page | Card remains in Qualified (server confirmed) | `[ ]` |
| 54 | Drag card back (revert test) | Card returns to original column | `[ ]` |
| 55 | Drag to **Won** column | Stage = won in DB | `[ ]` |
| 56 | Empty column shows placeholder text | "No contacts in this stage" | `[ ]` |
| 57 | Column header shows contact count | Count matches actual cards | `[ ]` |

---

## 6. Timeline

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 58 | Open contact detail → Timeline section | Section visible (may be empty) | `[ ]` |
| 59 | Click **Add note** → type text → Submit | Note appears with "just now" label and Note icon | `[ ]` |
| 60 | Click **Add call** → Submit | Call event shown with Phone icon | `[ ]` |
| 61 | Click **Add meeting** → Submit | Meeting event shown with Calendar icon | `[ ]` |
| 62 | Click **Add email** → Submit | Email event shown with Mail icon | `[ ]` |
| 63 | Click **Add WhatsApp** → Submit | WhatsApp event shown with MessageSquare icon | `[ ]` |
| 64 | Click delete (×) on a note | Event removed from timeline | `[ ]` |
| 65 | Reload page | All events persist | `[ ]` |
| 66 | Timeline sorted newest first | Most recent event at top | `[ ]` |

---

## 7. Activities

### 7.1 Per-Contact Activities

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 67 | Open contact detail → Activities section | Section visible | `[ ]` |
| 68 | Add task: type=task, title="Follow up", due=tomorrow | Appears in pending activities | `[ ]` |
| 69 | Add overdue activity: due=yesterday | Red border/highlight shown | `[ ]` |
| 70 | Click **Complete** on activity | Moves to Completed section | `[ ]` |
| 71 | Click **Delete** on activity | Removed from list | `[ ]` |
| 72 | Activity type dropdown shows all types | task, follow_up, call, meeting, email | `[ ]` |

### 7.2 Global Activities Page

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 73 | Navigate to `/dashboard/crm/activities` | Page loads with org-wide activity list | `[ ]` |
| 74 | Pending activities sorted by due date | Soonest due at top | `[ ]` |
| 75 | Overdue activities highlighted in red | Visual distinction from upcoming | `[ ]` |
| 76 | Contact name is a link | Links to `/dashboard/crm/[id]` | `[ ]` |
| 77 | Quick-add form on activities page | Creates activity without navigating away | `[ ]` |

---

## 8. Import

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 78 | Navigate to `/dashboard/crm/import` | Import page with format guide shown | `[ ]` |
| 79 | Download template CSV link | Downloads `crm_template.csv` | `[ ]` |
| 80 | Open template | Has columns: full_name, email, phone, company, notes, pipeline_stage | `[ ]` |
| 81 | Upload 3-row CSV with valid data | Preview table shows 3 rows | `[ ]` |
| 82 | Preview shows correct values | Name, email, company correct in preview | `[ ]` |
| 83 | Click **Import** | "Imported 3 contacts" success message | `[ ]` |
| 84 | Navigate to CRM | 3 new contacts appear | `[ ]` |
| 85 | Re-import same CSV | "Skipped X duplicates" or all imported again | `[ ]` |
| 86 | Upload CSV with missing required field (no name) | Error row shown, skipped gracefully | `[ ]` |
| 87 | Upload CSV with invalid pipeline_stage | Row skipped or inserted with default 'lead' | `[ ]` |
| 88 | Upload 200-row CSV | Imported in batches of 50; all appear in CRM | `[ ]` |

---

## 9. Export

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 89 | Click **Export CSV** | Browser downloads file (not blank) | `[ ]` |
| 90 | Open downloaded CSV | Has header row: id, full_name, email, phone, company, pipeline_stage, source, created_at | `[ ]` |
| 91 | CSV contains real contact data | Not all `undefined` values | `[ ]` |
| 92 | CSV handles commas in company name | Values correctly quoted | `[ ]` |
| 93 | Export with 0 contacts | CSV with header only, no data rows | `[ ]` |
| 94 | Deleted contacts excluded from export | Soft-deleted rows not in file | `[ ]` |

---

## 10. AI Summary / Insights

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 95 | Open contact detail | **AI Insights** panel visible | `[ ]` |
| 96 | Initial state | Scores may show 0 or "--" until refreshed | `[ ]` |
| 97 | Click **Refresh AI Insights** | Loading spinner shown | `[ ]` |
| 98 | Wait ~3 seconds | Lead score (0–100), Risk score, Opportunity score appear | `[ ]` |
| 99 | Summary text populated | Non-empty paragraph about the contact | `[ ]` |
| 100 | Next action text populated | Concrete recommendation shown | `[ ]` |
| 101 | Suggested email section | Collapsible with draft email body | `[ ]` |
| 102 | Suggested WhatsApp section | Collapsible with draft message | `[ ]` |
| 103 | Reload page | AI scores and text persist (not re-fetched) | `[ ]` |
| 104 | Contact with no timeline/activities | AI still generates insights (graceful fallback) | `[ ]` |
| 105 | OpenAI unavailable / rate limited | "AI service unavailable" error shown, no crash | `[ ]` |

---

## 11. Permissions

### 11.1 Role: Member

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 106 | Log in as org member (non-admin) | Can view CRM contacts | `[ ]` |
| 107 | Member tries to hard-delete contact | 403 or "Admin required" error | `[ ]` |
| 108 | Member can create, edit, soft-delete contacts | Allowed | `[ ]` |
| 109 | Member can add timeline events | Allowed | `[ ]` |
| 110 | Member tries to delete another user's timeline event | Blocked (403) | `[ ]` |
| 111 | Member can create/assign tags | Allowed | `[ ]` |
| 112 | Member cannot delete tags | Blocked (403) | `[ ]` |

### 11.2 Role: Admin / Owner

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 113 | Admin can hard-delete any contact | Allowed | `[ ]` |
| 114 | Admin can delete any timeline event | Allowed | `[ ]` |
| 115 | Admin can delete tags | Allowed | `[ ]` |
| 116 | Admin can delete any activity | Allowed | `[ ]` |

---

## 12. Audit Logs

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 117 | Create a contact | Audit event `crm.contact.create` logged | `[ ]` |
| 118 | Update a contact | Audit event `crm.contact.update` logged | `[ ]` |
| 119 | Soft-delete a contact | Audit event `crm.contact.soft_delete` logged | `[ ]` |
| 120 | Hard-delete a contact | Audit event `crm.contact.hard_delete` logged | `[ ]` |
| 121 | Import contacts | Audit event `crm.contact.import` logged with count | `[ ]` |
| 122 | Navigate to `/dashboard/settings/audit` | Events appear with actor, action, timestamp | `[ ]` |
| 123 | Events are immutable | No edit/delete option in audit UI | `[ ]` |

---

## 13. Multi-Tenant Isolation

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 124 | Log in as User A (Org A) | Sees only Org A contacts | `[ ]` |
| 125 | Log in as User B (Org B) | Sees only Org B contacts | `[ ]` |
| 126 | Attempt direct API call with Org A's contact ID from Org B session | 0 rows returned (RLS blocks) | `[ ]` |
| 127 | Tags created in Org A | Not visible in Org B | `[ ]` |
| 128 | Pipeline stages are per-org | Org B contacts don't appear in Org A pipeline | `[ ]` |

---

## 14. RLS Validation (run in Supabase SQL Editor)

```sql
-- 14.1 All new tables have RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('crm_tags','crm_contact_tags','crm_timeline_events','crm_activities');
-- Expected: all 4 rows show rowsecurity = true
```

| Check | Expected | Result |
|-------|----------|--------|
| crm_tags.rowsecurity | true | `[ ]` |
| crm_contact_tags.rowsecurity | true | `[ ]` |
| crm_timeline_events.rowsecurity | true | `[ ]` |
| crm_activities.rowsecurity | true | `[ ]` |

```sql
-- 14.2 Pipeline stage constraint is enforced
INSERT INTO crm_contacts (organization_id, full_name, pipeline_stage)
VALUES ((SELECT id FROM organizations LIMIT 1), 'Test Constraint', 'invalid_stage');
-- Expected: ERROR: new row for relation "crm_contacts" violates check constraint
--           "crm_contacts_pipeline_stage_check"
```

| Check | Expected | Result |
|-------|----------|--------|
| Invalid stage INSERT | Constraint violation error | `[ ]` |

```sql
-- 14.3 Cross-tenant query returns 0 rows
-- Replace <org_a_id> with a real org ID
SELECT COUNT(*) FROM public.search_crm_contacts('<org_a_id>', null)
-- Call from a session authenticated as a user NOT in org_a
-- Expected: raises "Access denied" (not a data leak)
```

| Check | Expected | Result |
|-------|----------|--------|
| Cross-org RPC call | "Access denied" exception | `[ ]` |

---

## 15. Performance

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 129 | Load CRM with 50 contacts | Page renders in < 2 seconds | `[ ]` |
| 130 | Search 50 contacts | Results appear within 300ms debounce + < 500ms query | `[ ]` |
| 131 | Open Pipeline board with 50 contacts | Board renders in < 2 seconds | `[ ]` |
| 132 | Drag a card on Pipeline | Drop registers in < 500ms (optimistic update) | `[ ]` |
| 133 | Open contact with 20 timeline events | Detail page renders in < 2 seconds | `[ ]` |
| 134 | AI Insights call | Response within 10 seconds (GPT-4o-mini) | `[ ]` |

---

## 16. Edge Cases

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 135 | Contact with emoji in name | Displays correctly, no DB error | `[ ]` |
| 136 | Contact with 500-char note | Stored and displayed correctly | `[ ]` |
| 137 | Contact with special chars in company (`O'Brien & Sons`) | CSV export correctly quotes the field | `[ ]` |
| 138 | Upload CSV with UTF-8 BOM | Parsed correctly (first column name not `﻿full_name`) | `[ ]` |
| 139 | Pipeline drag with network error | Card reverts to original column (optimistic revert) | `[ ]` |
| 140 | Submit empty contact form | Validation error shown, no DB insert | `[ ]` |
| 141 | Delete a contact that has tags + timeline + activities | Cascades correctly, no orphan rows | `[ ]` |
| 142 | Restore a contact that had tags | Tags reappear on restored contact | `[ ]` |
| 143 | Two tabs open — create contact in tab A | Tab B shows it on next navigation | `[ ]` |
| 144 | Search while import is running | No race condition crash | `[ ]` |

---

## 17. Regression Tests (pre-Sprint 1 features still working)

| # | Feature | Action | Expected | Result |
|---|---------|--------|----------|--------|
| 145 | Auth | Login / logout | Normal | `[ ]` |
| 146 | RAG Assistant | Ask a question | Answer with sources | `[ ]` |
| 147 | Knowledge Base | Add a document | Auto-ingested | `[ ]` |
| 148 | Settings | Invite a member | Invite email sent or enqueued | `[ ]` |
| 149 | Usage page | Load `/dashboard/usage` | Shows real data, no crash | `[ ]` |
| 150 | Health | GET `/api/health` | `{"status":"ready"}` | `[ ]` |
| 151 | Dashboard KPIs | Load `/dashboard` | Recharts area chart loads | `[ ]` |
| 152 | CRM Dashboard KPIs | CRM section on `/dashboard` | 6 metric cards with numbers (not undefined) | `[ ]` |

---

## Sign-Off

| Gate | Status |
|------|--------|
| All CRUD tests pass | `[ ]` |
| Search and filters work | `[ ]` |
| Tags fully functional | `[ ]` |
| Pipeline DnD works end-to-end | `[ ]` |
| Timeline immutability confirmed | `[ ]` |
| Import/Export complete | `[ ]` |
| AI Insights returns real data | `[ ]` |
| Permissions enforced (member vs admin) | `[ ]` |
| Audit log populated | `[ ]` |
| Multi-tenant isolation confirmed | `[ ]` |
| RLS active on all 4 new tables | `[ ]` |
| Pipeline stage constraint enforced | `[ ]` |
| Performance within targets | `[ ]` |
| Edge cases handled gracefully | `[ ]` |
| No regression in pre-Sprint 1 features | `[ ]` |

**Total tests**: 152  
**Pass**: ___ / 152  
**Fail**: ___  
**Skip**: ___

**Approved for production**: Yes / No  
**Approved by**: ________________  
**Date**: ________________
