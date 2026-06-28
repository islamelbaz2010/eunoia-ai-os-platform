# 02 — Product

Complete documentation of every page, feature, and user workflow.

---

## Application Shell

### Landing Page (`/`)
- **File**: `src/app/page.tsx`
- **Type**: Server component (public)
- **Content**: Product tagline, description, two CTAs: "Sign in" (`/login`) and "Get started" (`/signup`)
- **Design**: Dark glass morphism, Eunoia indigo accent color, hospitality tagline

### Global Layout (`src/app/layout.tsx`)
- Applies Geist Sans + Geist Mono fonts
- Sets `dark` class on `<html>` for dark mode
- Full SEO metadata: title template, OG tags, Twitter card, robots directives
- `metadataBase` reads `NEXT_PUBLIC_APP_URL` (defaults to `https://eunoiaos.com`)

### Global CSS (`src/app/globals.css`)
- Tailwind v4 (`@import "tailwindcss"`)
- CSS custom properties: `--background` (#08090d), `--surface` (#0f1117), `--accent` (#6366f1 indigo), `--accent-2` (#22d3ee cyan)
- Two reusable classes: `.glass-panel` (frosted glass card), `.kpi-card` (gradient metric card)
- Body has radial gradient background (dark navy → deep black)

---

## Authentication

### Login Page (`/login`)
- **File**: `src/app/login/page.tsx`
- **Type**: Client component
- **Form fields**: Email, Password
- **Action**: `login()` Server Action in `src/lib/auth/actions.ts`
- **Success**: Redirect to `/dashboard`
- **Error**: Inline red text below password field
- **Pending state**: "Signing in..." button text, disabled state
- Link to `/signup`

### Signup Page (`/signup`)
- **File**: `src/app/signup/page.tsx`
- **Type**: Client component
- **Form fields**: Full name, Email, Password (min 8 chars)
- **Action**: `signup()` Server Action
- **Success**: Redirect to `/dashboard` (triggers onboarding if no org)
- **Profile creation**: Automatic via `handle_new_user` Postgres trigger → creates `profiles` row with `full_name`
- Link to `/login`

### Auth Callback (`/auth/callback`)
- **File**: `src/app/auth/callback/route.ts`
- **Type**: Route handler
- **Purpose**: PKCE OAuth / magic link code exchange
- Exchanges `code` query param for Supabase session
- On success: redirects to `?next=` param (default `/dashboard`)
- On failure: redirects to `/login?error=auth_callback_failed`

### Logout
- **Trigger**: Form submit button in `DashboardLayout` sidebar
- **Action**: `logout()` Server Action — calls `supabase.auth.signOut()` → redirect `/login`

---

## Onboarding

### Organization Creation (`/onboarding`)
- **Files**: `src/app/onboarding/page.tsx`, `src/app/onboarding/actions.ts`
- **Trigger**: Users with no org membership are redirected here from `DashboardLayout`
- **Form fields**: Organization name (2–80 chars)
- **Process**:
  1. `slugify(name)` generates a URL-safe slug with random 5-char suffix
  2. `create_organization(org_name, org_slug)` RPC atomically creates org + owner membership
  3. Anti-abuse: max 3 owned orgs per user (enforced in Postgres)
  4. Redirect to `/dashboard` on success
- **Placeholder**: "Grand Nile Tower Hotel" shows the target audience

---

## Dashboard Shell

### Layout (`/dashboard/*`)
- **File**: `src/app/dashboard/layout.tsx`
- **Checks**:
  1. `verifySession()` — redirects to `/login` if no session
  2. `getProfile()` — loads user profile
  3. `getActiveOrganization()` — loads first org membership
  4. If no org AND not super admin → redirect to `/onboarding`
- **Sidebar**:
  - Organization name + user role displayed at top
  - Navigation: Dashboard, CRM, Knowledge Base, RAG Assistant, Audit Logs, Usage
  - Super admin only: "Super Admin" nav item
  - Bottom: Settings, Sign out
- **Header**: Shows user's role + full name
- **NavLink** (`nav-link.tsx`): Client component using `usePathname()` for active state highlighting

---

## Dashboard Overview (`/dashboard`)

- **File**: `src/app/dashboard/page.tsx`
- **Type**: Async server component
- **Data fetched** (all parallel):
  1. KPI counts: total CRM contacts, KB documents, usage events, audit events
  2. Usage over time (last 14 days, up to 2000 rows, aggregated by MM-DD)
  3. Contact status breakdown (up to 5000 rows, aggregated by status)
- **Charts**:
  - `UsageChart` — Recharts AreaChart (indigo gradient area)
  - `StatusChart` — Recharts PieChart (donut, 5 colors)
- **KPI cards**: 4 cards using `.kpi-card` CSS class

---

## CRM Module

### CRM Page (`/dashboard/crm`)
- **File**: `src/app/dashboard/crm/page.tsx`
- **Data**: Contacts ordered by `created_at DESC`, limit 200
- **Columns displayed**: Name, Email, Company, Status badge

### Add Contact Form (`ContactForm`)
- **File**: `src/app/dashboard/crm/contact-form.tsx`
- **Fields**: Full name (required, 2–100 chars), Email, Phone (max 30 chars), Company (max 100 chars)
- **Action**: `createContact()` → validates with Zod → inserts to `crm_contacts`
- **Side effects**: `logAuditEvent` + `logUsageEvent` (both fire-and-forget)
- **Cache**: `revalidatePath("/dashboard/crm")` on success

### CRM Contact Data Model
```
crm_contacts:
  id uuid PK
  organization_id uuid FK→organizations
  full_name text NOT NULL
  email text (nullable)
  phone text (nullable)
  company text (nullable)
  notes text (nullable, not exposed in UI yet)
  status crm_lead_status: new|contacted|qualified|won|lost (default: new)
  created_by uuid FK→profiles ON DELETE SET NULL
  created_at / updated_at timestamptz
```

### Missing CRM Features
- No edit contact
- No delete contact
- No status change from UI
- No notes field in form
- No search / filter
- No export

---

## Knowledge Base Module

### KB Page (`/dashboard/knowledge-base`)
- **File**: `src/app/dashboard/knowledge-base/page.tsx`
- **Data**: Documents ordered by `updated_at DESC`, limit 100
- **Columns**: Title, Language (uppercase), Status badge

### Add Document Form (`DocumentForm`)
- **File**: `src/app/dashboard/knowledge-base/document-form.tsx`
- **Fields**: Title (2–200 chars), Language (en/ar/ru/it), Content (10–50,000 chars, textarea)
- **Action**: `createDocument()`:
  1. Validates with Zod (max 50,000 chars)
  2. Inserts `knowledge_base_documents` row (status: `published`)
  3. Calls `ingestDocument()` — chunks + embeds + stores
  4. On embedding failure: **deletes the document row** (atomically avoids orphaned unindexed docs)
  5. `logAuditEvent` + `logUsageEvent` (fire-and-forget)
  6. `revalidatePath("/dashboard/knowledge-base")`

### KB Document Data Model
```
knowledge_base_documents:
  id uuid PK
  organization_id uuid FK→organizations
  title text NOT NULL
  content text (the raw text)
  status kb_status: draft|published|archived (default: draft; createDocument always sets published)
  language: en|ar|ru|it (default: en)
  created_by uuid FK→profiles ON DELETE SET NULL
  created_at / updated_at timestamptz

knowledge_base_chunks:
  id uuid PK
  document_id uuid FK→knowledge_base_documents ON DELETE CASCADE
  organization_id uuid FK→organizations
  content text NOT NULL
  embedding vector(1536) NOT NULL
  created_at timestamptz
```

### Missing KB Features
- No edit document content
- No delete document from UI
- No re-ingest / refresh embedding
- No file upload (PDF, DOCX) — text paste only
- No per-document status management

---

## RAG Assistant

### Assistant Page (`/dashboard/assistant`)
- **File**: `src/app/dashboard/assistant/page.tsx`
- **Chat UI**: `AssistantChat` client component

### AssistantChat (`chat.tsx`)
- **Type**: Client component using `useTransition`
- **State**: Messages array (user/assistant), pending, error
- **Input**: Text field (question), "Ask" button
- **Conversation**: Accumulates messages in local state (no persistence)
- **Flow**: Calls `askAssistant()` server action → appends response

### `askAssistant()` Server Action
- **File**: `src/app/dashboard/assistant/actions.ts`
- **Validation**: Question 3–500 chars (Zod `.transform(s => s.trim())`)
- **Steps**:
  1. `verifySession()` + `getActiveOrganization()`
  2. `embedText(question)` → OpenAI `text-embedding-3-small` → 1536-dim vector
  3. `match_kb_chunks` RPC (6 candidates)
  4. Filter: `similarity >= 0.3` (MIN_SIMILARITY)
  5. If 0 sources pass: return "couldn't find anything relevant" message
  6. Assemble context: numbered `[1] ... [2] ...` format
  7. GPT-4o-mini completion (max 1024 tokens)
  8. `logUsageEvent(rag_query)` fire-and-forget
  9. Return `{ answer, sources }`
- **System prompt**: "You are Eunoia, an AI assistant for a hospitality property. Answer only using the provided context. Cite sources with [1], [2], etc. If the context doesn't contain the answer, say you don't know — never invent information."

### Missing Assistant Features
- No streaming (blocking HTTP call)
- No conversation persistence (messages lost on page refresh)
- No source display in UI (sources returned but not rendered)
- No follow-up context (each question is stateless)

---

## Settings Module

### Settings Page (`/dashboard/settings`)
- **File**: `src/app/dashboard/settings/page.tsx`
- **Sections**: Account info, Organization info, Members table, Invite form

### Member Management
- **MemberRow** (`member-row.tsx`): Client component with optimistic UI
  - Role dropdown (admins see viewer/member/admin; owners also see owner)
  - Remove button
  - Calls `updateMemberRole(memberId, role)` or `removeMember(memberId)`
- **Guards**:
  - Cannot demote the last owner
  - Cannot remove the last owner
  - Cannot remove yourself (must transfer ownership first)
  - Admins cannot assign owner role

### Invite System
- **InviteForm** (`invite-form.tsx`): Email + Role selector + Send button
  - Role options: viewer/member/admin (owner option only for owners)
- **InviteRow** (`invite-row.tsx`): Shows pending invite email, role, Revoke button
- **`createInvite()`**: Inserts `organization_invites` row; 14-day expiry set by DB default
- **`revokeInvite()`**: Sets status to `revoked`
- **`acceptInvite()`**: Calls `accept_org_invite(token)` RPC (this is the server action form)
- **Token delivery**: NOT via email — the token must be manually shared (e.g., send the `/invite?token=...` URL)

### Invite Acceptance Page (`/invite`)
- **File**: `src/app/invite/page.tsx`
- **Flow**: Reads `?token=` query param → calls `accept_org_invite` RPC → redirects to `/dashboard`
- On invalid/expired token: shows error UI

---

## Audit Logs (`/dashboard/audit-logs`)

- **File**: `src/app/dashboard/audit-logs/page.tsx`
- **Data**: Last 50 audit events, ordered by `created_at DESC`
- **Columns**: Action string, Target type, Timestamp (localized)
- **Events tracked**:
  - `crm_contact.created` (CRM)
  - `kb_document.created` (Knowledge Base)
  - `organization_invite.created` (Settings)
  - `organization_invite.revoked` (Settings)
  - `organization_member.role_updated` (Settings)
  - `organization_member.removed` (Settings)

---

## Usage Tracking (`/dashboard/usage`)

- **File**: `src/app/dashboard/usage/page.tsx`
- **Data**: All usage events (limit 10,000), aggregated by `event_type` in JavaScript
- **Display**: Grid of KPI cards, one per event type
- **Event types tracked**:
  - `rag_query` (RAG assistant)
  - `crm_contact_created` (CRM)
  - `kb_document_created` (Knowledge Base)

---

## Super Admin (`/dashboard/admin`)

- **File**: `src/app/dashboard/admin/page.tsx`
- **Access**: `is_super_admin = true` on the user's profile (checked in-page with redirect)
- **Data**: All organizations across the platform, ordered by `created_at DESC`
- **Columns**: Organization name, slug, created date
- **Super admin bypass**: Super admins can access `/dashboard` without an org membership

---

## Error Handling

| Location | File | Behavior |
|----------|------|---------|
| Global | `src/app/error.tsx` | Shows digest ID only (no raw error message), "Try again" button |
| CRM | `src/app/dashboard/crm/error.tsx` | "Failed to load CRM" + digest + retry |
| Knowledge Base | `src/app/dashboard/knowledge-base/error.tsx` | Same pattern |
| Settings | `src/app/dashboard/settings/error.tsx` | Same pattern |

All error boundaries show `error.digest` (a hash, not the raw error message) — this is intentional security hardening. Raw error messages are never exposed to the browser.

---

## Loading States

Loading files exist for: dashboard root, assistant, audit-logs, crm, knowledge-base, settings, usage, admin. These provide skeleton UIs during server component data fetching. Current implementation renders a minimal spinner/blank — not full skeleton screens.

---

## API Routes

### `GET /api/health`
- **File**: `src/app/api/health/route.ts`
- **Purpose**: Liveness + dependency check for monitoring
- **Checks**: Supabase REST API connectivity (3s timeout)
- **Returns**: `{ status: "ok"|"degraded", ts: number, checks: { db: "ok"|"error:STATUS"|"unreachable"|"misconfigured" } }`
- **HTTP status**: 200 if all checks pass, 503 if any fail

---

## SEO / Discovery

| File | Purpose |
|------|---------|
| `src/app/sitemap.ts` | Dynamic sitemap.xml (`/`, `/login`, `/signup`) |
| `src/app/manifest.ts` | PWA manifest (name, icons, theme color #6366f1) |
| `public/robots.txt` | Search engine directives |
| `src/app/layout.tsx` | Full OG + Twitter card metadata |

The PWA manifest references `/icon.png` (192×192) and `/icon-512.png` (512×512) which are **not yet in the `public/` folder** — this is a known pending item.
