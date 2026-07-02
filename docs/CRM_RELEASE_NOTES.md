# CRM Release Notes — Sprint 1

## v1.0.0 — 2026-07-03

### Complete CRM Production Platform

**9 phases shipped. All production-ready.**

---

### Phase 1 — Complete Contact Management
- Full contact lifecycle: create, update, soft delete, restore, hard delete
- Archive/unarchive contacts (separate from delete)
- Duplicate detection via `check_crm_duplicate` RPC before save
- "Add anyway" override (`confirmed=true`) for intentional duplicates
- All fields: name, email, phone, company, website, LinkedIn URL, notes
- Pipeline stage + status per contact
- Owner assignment (any org member)
- Source tracking (manual, import, system)
- All server actions Zod-validated, audit-logged, org-scoped

### Phase 2 — Contact Timeline
- Timeline per contact: note, call, meeting, email, WhatsApp, system events
- Inline add form on contact detail page
- Delete events with hover reveal
- Relative time formatting ("3 hours ago")

### Phase 3 — Tags
- Create tags with name + hex color
- Assign/remove tags from contacts
- Tag badge display on contact detail
- One-click assign from unassigned pool

### Phase 4 — Pipeline (Kanban Board)
- 6 stages: Lead → Qualified → Proposal → Negotiation → Won → Lost
- Native HTML5 drag-and-drop (no external library)
- Optimistic updates with server-side revert on error
- Stage stored as `text` with CHECK constraint (no enum migration complexity)

### Phase 5 — Search
- Global full-text search via `search_crm_contacts` RPC (PostgreSQL `to_tsvector`)
- Instant debounced client search (300ms)
- URL-based params: `q`, `status`, `stage`, `view`, `page`
- Pagination: 50 rows per page with `buildUrl` helper
- Filter chips: status, pipeline stage, view (active/archived/deleted)

### Phase 6 — Import/Export
- CSV import: parse in browser, preview first 10 rows, confirm before import
- Batch insert (50 rows/batch) with duplicate detection
- Import report: inserted, skipped, errors
- CSV export: all active contacts, max 10,000 rows
- Template CSV download link
- Max 500 rows per import, max 5 MB file

### Phase 7 — Activities
- Activity types: task, follow-up, call, meeting, email
- Due dates with overdue highlighting (red border)
- Mark complete / delete actions
- Owner assignment
- Global activities page: pending sorted by due date, recently completed
- Per-contact activities panel on detail page

### Phase 8 — CRM Dashboard
- `get_crm_metrics` RPC on dashboard overview
- 6 CRM KPIs: new contacts (30d), qualified, in-pipeline, won, lost, conversion rate
- Conversion rate = won / (won + lost) * 100
- Zero-dependency on O(N) JS aggregation

### Phase 9 — AI Insights
- Per-contact AI analysis via GPT-4o-mini
- Scores: lead (conversion likelihood), risk (going cold), opportunity (value)
- Summary: 2-3 sentence relationship overview
- Next action: single most important thing to do now
- Suggested email + WhatsApp message
- AI results persisted to `crm_contacts` columns (`ai_*`)
- Refresh button on contact detail page

---

### Database Migration
- **`0010_crm_platform.sql`** — Must be applied before any Phase 1+ features work

### Breaking Changes
- None (additive-only migration)

### Known Limitations
- Pipeline value is not tracked (no deal amount field in Phase 1)
- Average response time requires event timestamps (Phase 2 foundation, not yet calculated)
- Import deduplication is at batch level (whole batch skipped on unique violation, not per-row)
