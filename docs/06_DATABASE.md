# 06 — Database

All database objects are in the `public` schema on a Supabase-managed PostgreSQL instance with pgvector.

---

## Enums

| Enum | Values | Used by |
|------|--------|---------|
| `org_role` | `owner`, `admin`, `member`, `viewer` | `organization_members.role`, `organization_invites.role` |
| `kb_status` | `draft`, `published`, `archived` | `knowledge_base_documents.status` |
| `crm_lead_status` | `new`, `contacted`, `qualified`, `won`, `lost` | `crm_contacts.status` |
| `invite_status` | `pending`, `accepted`, `revoked`, `expired` | `organization_invites.status` |

---

## Tables

### `organizations`

The multi-tenant anchor. Every piece of data belongs to an org.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `name` | text | NO | — | Display name |
| `slug` | text | NO | — | UNIQUE. URL-safe identifier |
| `is_super_admin_org` | boolean | NO | false | Reserved for platform team |
| `created_at` | timestamptz | NO | now() | |
| `updated_at` | timestamptz | NO | now() | Auto-maintained by trigger |

**RLS Policies**:
- `SELECT`: `is_org_member(id) OR is_super_admin()`
- `ALL`: `is_super_admin()` (super admin can create/update/delete orgs directly)
- Normal org creation goes through the `create_organization` RPC, not direct INSERT

---

### `profiles`

One profile per auth user. Created automatically by trigger when user signs up.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | — | PK; FK→auth.users ON DELETE CASCADE |
| `full_name` | text | YES | — | From signup form, stored in `raw_user_meta_data` |
| `avatar_url` | text | YES | — | OAuth avatar, if applicable |
| `is_super_admin` | boolean | NO | false | Platform-level superuser flag |
| `created_at` | timestamptz | NO | now() | |
| `updated_at` | timestamptz | NO | now() | Auto-maintained by trigger |

**RLS Policies**:
- `SELECT`: `id = auth.uid() OR is_super_admin()`
- `UPDATE`: `id = auth.uid()` (own profile only)

---

### `organization_members`

RBAC join table. A user can be a member of multiple organizations with different roles.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `organization_id` | uuid | NO | — | FK→organizations ON DELETE CASCADE |
| `user_id` | uuid | NO | — | FK→profiles ON DELETE CASCADE |
| `role` | org_role | NO | `member` | |
| `created_at` | timestamptz | NO | now() | |

**Unique constraint**: `(organization_id, user_id)` — one membership per org per user.

**RLS Policies**:
- `SELECT`: `is_org_member(organization_id) OR is_super_admin()`
- `ALL`: `org_role(organization_id) IN ('owner','admin') OR is_super_admin()`

**Indexes**:
- `organization_members_user_id_idx (user_id)` — DAL lookups by user
- `organization_members_org_id_idx (organization_id)` — member list lookups
- `org_members_org_role_idx (organization_id, role)` — last-owner count queries

---

### `crm_contacts`

Guest and lead records, scoped to an organization.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `organization_id` | uuid | NO | — | FK→organizations ON DELETE CASCADE |
| `full_name` | text | NO | — | |
| `email` | text | YES | — | |
| `phone` | text | YES | — | |
| `company` | text | YES | — | |
| `notes` | text | YES | — | Not exposed in current UI |
| `status` | crm_lead_status | NO | `new` | Pipeline stage |
| `created_by` | uuid | YES | — | FK→profiles **ON DELETE SET NULL** |
| `created_at` | timestamptz | NO | now() | |
| `updated_at` | timestamptz | NO | now() | Auto-maintained by trigger |

**RLS Policies**:
- `SELECT`: `is_org_member(organization_id) OR is_super_admin()`
- `INSERT`: `is_org_member(organization_id)`
- `UPDATE`: `is_org_member(organization_id)`
- `DELETE`: `org_role(organization_id) IN ('owner','admin') OR is_super_admin()`

**Indexes**:
- `crm_contacts_org_id_idx (organization_id)`

**Note on FK**: `created_by` uses `ON DELETE SET NULL` (migration 0005). Without this, deleting a user would cascade to `profiles` but then RESTRICT on `crm_contacts` (blocking user deletion entirely).

---

### `knowledge_base_documents`

Source documents for the RAG pipeline.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `organization_id` | uuid | NO | — | FK→organizations ON DELETE CASCADE |
| `title` | text | NO | — | |
| `content` | text | YES | — | Raw text (max 50,000 chars enforced in app) |
| `status` | kb_status | NO | `draft` | App always sets `published` on create |
| `language` | text | NO | `en` | `en`, `ar`, `ru`, `it` |
| `created_by` | uuid | YES | — | FK→profiles **ON DELETE SET NULL** |
| `created_at` | timestamptz | NO | now() | |
| `updated_at` | timestamptz | NO | now() | Auto-maintained by trigger |

**RLS Policies**:
- `SELECT`: `is_org_member(organization_id) OR is_super_admin()`
- `INSERT`: `is_org_member(organization_id)`
- `UPDATE`: `is_org_member(organization_id)` (also: migration 0004 adds explicit UPDATE policy)
- `DELETE (org-level)`: `org_role(organization_id) IN ('owner','admin') OR is_super_admin()`
- `DELETE (creator)`: `created_by = auth.uid()` — allows creator to delete their own doc (used for cleanup on embedding failure)

**Indexes**:
- `kb_documents_org_id_idx (organization_id)`
- `kb_documents_updated_at_idx (organization_id, updated_at DESC)` — sorted list queries

---

### `knowledge_base_chunks`

The vectorized representation of document content. This is what the HNSW index searches.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `document_id` | uuid | NO | — | FK→knowledge_base_documents ON DELETE CASCADE |
| `organization_id` | uuid | NO | — | FK→organizations ON DELETE CASCADE; denormalized for RLS efficiency |
| `content` | text | NO | — | The chunk text (max ~1000 chars) |
| `embedding` | vector(1536) | **NO** | — | **NOT NULL** enforced in migration 0006 |
| `created_at` | timestamptz | NO | now() | |

**RLS Policies**:
- `SELECT`: `is_org_member(organization_id) OR is_super_admin()`
- `INSERT`: `is_org_member(organization_id)`
- `DELETE`: `is_org_member(organization_id) OR is_super_admin()` (migration 0004)

**Indexes**:
- `kb_chunks_org_id_idx (organization_id)` — RLS filter
- `kb_chunks_document_id_idx (document_id)` — re-ingestion DELETE
- `knowledge_base_chunks_embedding_idx` — **HNSW index (vector_cosine_ops)** — the pgvector similarity search index

**Critical design note**: `embedding IS NOT NULL` was added in migration 0006 after deleting pre-existing NULL rows. A chunk with NULL embedding would never appear in vector search but wastes space and causes confusion.

---

### `audit_logs`

Immutable event log. Records all significant actions.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `organization_id` | uuid | YES | — | FK→organizations ON DELETE CASCADE |
| `actor_id` | uuid | YES | — | FK→profiles **ON DELETE SET NULL** |
| `action` | text | NO | — | String like `crm_contact.created` |
| `target_type` | text | YES | — | e.g., `crm_contact`, `organization_invite` |
| `target_id` | text | YES | — | UUID of the affected entity (as text) |
| `metadata` | jsonb | NO | `'{}'` | Extra context (role, email, etc.) |
| `created_at` | timestamptz | NO | now() | |

**No `updated_at`** — audit logs are immutable.

**RLS Policies**:
- `SELECT`: `is_org_member(organization_id) OR is_super_admin()`
- `INSERT`: `is_org_member(organization_id) OR is_super_admin()`
- No UPDATE or DELETE — immutability enforced by policy absence

**Indexes**:
- `audit_logs_org_id_idx (organization_id)`
- `audit_logs_created_at_idx (created_at DESC)`
- `audit_logs_org_created_idx (organization_id, created_at DESC)` — range queries

---

### `usage_events`

Usage metering. Tracks AI and CRM activity for billing and analytics.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `organization_id` | uuid | NO | — | FK→organizations ON DELETE CASCADE |
| `actor_id` | uuid | YES | — | FK→profiles **ON DELETE SET NULL** |
| `event_type` | text | NO | — | e.g., `rag_query`, `crm_contact_created` |
| `quantity` | numeric | NO | 1 | Amount (always 1 currently) |
| `metadata` | jsonb | NO | `'{}'` | |
| `created_at` | timestamptz | NO | now() | |

**RLS Policies**:
- `SELECT`: `is_org_member(organization_id) OR is_super_admin()`
- `INSERT`: `is_org_member(organization_id) OR is_super_admin()`

**Indexes**:
- `usage_events_org_id_idx (organization_id)`
- `usage_events_created_at_idx (created_at DESC)`
- `usage_events_org_type_idx (organization_id, event_type)` — aggregation queries

---

### `organization_invites`

Token-based invitation system.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `organization_id` | uuid | NO | — | FK→organizations ON DELETE CASCADE |
| `email` | text | NO | — | Invitee's email address |
| `role` | org_role | NO | `member` | Role to grant on acceptance |
| `token` | uuid | NO | gen_random_uuid() | The acceptance token (in invite URL) |
| `status` | invite_status | NO | `pending` | |
| `invited_by` | uuid | YES | — | FK→profiles **ON DELETE SET NULL** |
| `created_at` | timestamptz | NO | now() | |
| `expires_at` | timestamptz | NO | now() + 14 days | |

**Unique constraint**: `(organization_id, email, status)` — prevents duplicate pending invites.

**RLS Policies**:
- `ALL (admin)`: `org_role(organization_id) IN ('owner','admin') OR is_super_admin()`
- `SELECT (invitee)`: `email = (SELECT email FROM auth.users WHERE id = auth.uid())` — invitee can read their own invite

**Indexes**:
- `organization_invites_org_id_idx (organization_id)`
- `organization_invites_token_idx (token)` — token lookup in accept flow

---

## PostgreSQL Functions (RPCs)

### `is_org_member(target_org_id uuid) → boolean`
- **Type**: STABLE, SECURITY DEFINER
- **Purpose**: Returns true if `auth.uid()` is a member of the given org
- **Used by**: All RLS policies

### `org_role(target_org_id uuid) → org_role`
- **Type**: STABLE, SECURITY DEFINER
- **Purpose**: Returns the caller's role in the given org (NULL if not a member)
- **Used by**: RLS policies for admin-only operations

### `is_super_admin() → boolean`
- **Type**: STABLE, SECURITY DEFINER
- **Purpose**: Returns `profiles.is_super_admin` for `auth.uid()`; defaults to false
- **Used by**: All RLS policies as override

### `handle_new_user() → trigger`
- **Type**: TRIGGER FUNCTION, SECURITY DEFINER
- **Fires**: AFTER INSERT on `auth.users`
- **Action**: Inserts a `profiles` row with `full_name` and `avatar_url` from `raw_user_meta_data`
- **Critical**: Without this trigger, users would have no profile row and the DAL would return null everywhere

### `set_updated_at() → trigger`
- **Type**: TRIGGER FUNCTION
- **Fires**: BEFORE UPDATE on organizations, profiles, crm_contacts, knowledge_base_documents
- **Action**: Sets `new.updated_at = now()`

### `match_kb_chunks(query_embedding vector, target_org_id uuid, match_count int) → TABLE`
- **Type**: STABLE, SECURITY DEFINER
- **Purpose**: HNSW vector similarity search over organization's knowledge base chunks
- **Distance metric**: Cosine (`<=>` operator, `vector_cosine_ops`)
- **Returns**: `(id, document_id, content, similarity)` where `similarity = 1 - cosine_distance`
- **Security**: Checks `is_org_member OR is_super_admin` inside the function
- **Called from**: `askAssistant()` server action via `supabase.rpc("match_kb_chunks", {...})`
- **Embedding passed as**: `JSON.stringify(queryEmbedding)` — important: must be JSON string, not array

### `accept_org_invite(invite_token uuid) → uuid`
- **Type**: SECURITY DEFINER, LANGUAGE plpgsql
- **Purpose**: Atomically accepts an invite and creates org membership
- **Race condition fix (migration 0006)**: Uses `FOR UPDATE` lock on the invite row
- **Steps**:
  1. Get caller's email from `auth.users`
  2. Lock invite row (`FOR UPDATE`) and validate: pending, not expired, email matches
  3. INSERT into `organization_members` (`ON CONFLICT DO UPDATE SET role`)
  4. UPDATE invite status to `accepted`
  5. Return `organization_id`
- **Error**: Raises exception `'Invalid or expired invite'` on mismatch

### `create_organization(org_name text, org_slug text) → uuid`
- **Type**: SECURITY DEFINER, LANGUAGE plpgsql
- **Purpose**: Atomically creates an org and sets the caller as owner
- **Validations**:
  - Auth required
  - Name ≥ 2 chars
  - Slug must match `^[a-z0-9][a-z0-9-]*[a-z0-9]$`
  - Max 3 owned orgs per user (anti-abuse)
- **Steps**:
  1. INSERT into `organizations`
  2. INSERT into `organization_members` with role `owner`
  3. Return new org UUID

---

## Grants Summary

| Table | service_role | authenticated |
|-------|-------------|---------------|
| organizations | ALL | SELECT, INSERT, UPDATE, DELETE |
| profiles | ALL | SELECT, INSERT, UPDATE |
| organization_members | ALL | SELECT, INSERT, UPDATE, DELETE |
| crm_contacts | ALL | SELECT, INSERT, UPDATE, DELETE |
| knowledge_base_documents | ALL | SELECT, INSERT, UPDATE, DELETE |
| knowledge_base_chunks | ALL | SELECT, INSERT, UPDATE, DELETE |
| audit_logs | ALL | SELECT, INSERT |
| usage_events | ALL | SELECT, INSERT |
| organization_invites | ALL | SELECT, INSERT, UPDATE |

**Note**: `service_role` bypasses RLS. It is only used in integration scripts (`test-rag.js`), never in the Next.js application itself.

---

## Extensions Required

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "vector";    -- pgvector (1536-dim embeddings)
```
