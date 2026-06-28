# 19 — API Reference

All routes, server actions, and Supabase RPCs in the application.

---

## HTTP Routes

### `GET /`
**File**: `src/app/page.tsx`  
**Auth**: Public  
**Returns**: Landing page (HTML)

### `GET /login`
**File**: `src/app/login/page.tsx`  
**Auth**: Public (authenticated users redirected to /dashboard by proxy)  
**Returns**: Login form (HTML)

### `GET /signup`
**File**: `src/app/signup/page.tsx`  
**Auth**: Public (authenticated users redirected to /dashboard by proxy)  
**Returns**: Signup form (HTML)

### `GET /auth/callback?code=...&next=...`
**File**: `src/app/auth/callback/route.ts`  
**Auth**: Public  
**Purpose**: PKCE code exchange for OAuth/magic link  
**Params**: `code` (required), `next` (optional, defaults to `/dashboard`)  
**Response**: Redirect to `next` on success, `/login?error=auth_callback_failed` on failure

### `GET /onboarding`
**File**: `src/app/onboarding/page.tsx`  
**Auth**: Required (no org required)

### `GET /invite?token=...`
**File**: `src/app/invite/page.tsx`  
**Auth**: Required  
**Params**: `token` (UUID invite token)  
**Response**: Redirect to `/dashboard` on success, error page on failure

### `GET /dashboard`
**File**: `src/app/dashboard/page.tsx`  
**Auth**: Required + org membership required (or super admin)

### `GET /dashboard/crm`
**File**: `src/app/dashboard/crm/page.tsx`

### `GET /dashboard/knowledge-base`
**File**: `src/app/dashboard/knowledge-base/page.tsx`

### `GET /dashboard/assistant`
**File**: `src/app/dashboard/assistant/page.tsx`

### `GET /dashboard/audit-logs`
**File**: `src/app/dashboard/audit-logs/page.tsx`

### `GET /dashboard/usage`
**File**: `src/app/dashboard/usage/page.tsx`

### `GET /dashboard/settings`
**File**: `src/app/dashboard/settings/page.tsx`

### `GET /dashboard/admin`
**File**: `src/app/dashboard/admin/page.tsx`  
**Auth**: Required + `is_super_admin = true`

### `GET /api/health`
**File**: `src/app/api/health/route.ts`  
**Auth**: Public  
**Force dynamic**: Yes  
**Response**:
```json
// 200 OK
{ "status": "ok", "ts": 1719561600000, "checks": { "db": "ok" } }

// 503 Service Unavailable  
{ "status": "degraded", "ts": 1719561600000, "checks": { "db": "unreachable" } }
```
**Checks performed**: Supabase PostgREST reachability (3-second timeout)

---

## Server Actions

All server actions are marked `"use server"` and use `useActionState` (React 19) in their paired client components.

### `login(prevState, formData) → AuthFormState`
**File**: `src/lib/auth/actions.ts`  
**FormData fields**: `email`, `password`  
**Success**: `redirect("/dashboard")`  
**Error**: `{ error: string }`

### `signup(prevState, formData) → AuthFormState`
**File**: `src/lib/auth/actions.ts`  
**FormData fields**: `email`, `password`, `fullName`  
**Success**: `redirect("/dashboard")`  
**Error**: `{ error: string }`

### `logout()`
**File**: `src/lib/auth/actions.ts`  
**No form state** — called from form submit  
**Effect**: Signs out, redirects to `/login`

### `createOrganization(prevState, formData) → OnboardingState`
**File**: `src/app/onboarding/actions.ts`  
**FormData fields**: `name`  
**Validation**: name 2–80 chars  
**Success**: `redirect("/dashboard")`  
**Error**: `{ error: string }`  
**DB**: Calls `create_organization(org_name, org_slug)` RPC

### `createContact(prevState, formData) → ContactFormState`
**File**: `src/app/dashboard/crm/actions.ts`  
**FormData fields**: `fullName`, `email`, `phone`, `company`  
**Validation**: fullName 2–100, email valid (optional), phone ≤30, company ≤100  
**Success**: `revalidatePath("/dashboard/crm")`, returns undefined  
**Error**: `{ error: string }`  
**Side effects**: `logAuditEvent`, `logUsageEvent`

### `createDocument(prevState, formData) → DocumentFormState`
**File**: `src/app/dashboard/knowledge-base/actions.ts`  
**FormData fields**: `title`, `content`, `language`  
**Validation**: title 2–200, content 10–50000, language enum(en/ar/ru/it)  
**Success**: `revalidatePath("/dashboard/knowledge-base")`, returns undefined  
**Error**: `{ error: string }`  
**Side effects**: `ingestDocument()`, `logAuditEvent`, `logUsageEvent`

### `askAssistant(question) → AssistantResult`
**File**: `src/app/dashboard/assistant/actions.ts`  
**Not form-based** — called directly from `useTransition`  
**Param**: `question: string` (3–500 chars)  
**Returns**:
```typescript
type AssistantResult = {
  answer?: string
  sources?: { id: string; content: string; similarity: number }[]
  error?: string
}
```
**Side effects**: `logUsageEvent("rag_query")`

### `createInvite(prevState, formData) → SettingsFormState`
**File**: `src/app/dashboard/settings/actions.ts`  
**FormData fields**: `email`, `role`  
**Auth guard**: `hasRole(membership.role, "admin")`  
**Returns**: `{ success: string } | { error: string } | undefined`  
**Side effects**: `logAuditEvent`

### `revokeInvite(inviteId: string)`
**File**: `src/app/dashboard/settings/actions.ts`  
**Not form-based** — called directly from `useTransition`  
**Auth guard**: `requireAdmin()`  
**Effect**: Sets invite status to `revoked`  
**Side effects**: `logAuditEvent`

### `updateMemberRole(memberId: string, role: OrgRole)`
**File**: `src/app/dashboard/settings/actions.ts`  
**Not form-based** — called from `useTransition` in MemberRow  
**Auth guard**: `requireAdmin()`  
**Guards**:
- Only owners can assign `owner` role
- Cannot demote last owner
**Side effects**: `logAuditEvent`

### `removeMember(memberId: string)`
**File**: `src/app/dashboard/settings/actions.ts`  
**Auth guard**: `requireAdmin()`  
**Guards**:
- Only owners can remove owners
- Cannot remove yourself
- Cannot remove last owner
**Side effects**: `logAuditEvent`

### `acceptInvite(prevState, formData) → SettingsFormState`
**File**: `src/app/dashboard/settings/actions.ts`  
**FormData fields**: `token`  
**DB**: Calls `accept_org_invite(invite_token)` RPC  
**Returns**: `{ success: "Invite accepted." } | { error: string }`

---

## Supabase RPCs (called from app)

### `match_kb_chunks`
```typescript
supabase.rpc("match_kb_chunks", {
  query_embedding: JSON.stringify(number[]),  // 1536-dim vector as JSON string
  target_org_id: string,                       // UUID
  match_count: number,                         // default 6
})
// Returns: { id, document_id, content, similarity }[]
```

### `create_organization`
```typescript
supabase.rpc("create_organization", {
  org_name: string,
  org_slug: string,
})
// Returns: uuid (new org id)
// Throws on: auth missing, name too short, invalid slug, >3 owned orgs
```

### `accept_org_invite`
```typescript
supabase.rpc("accept_org_invite", {
  invite_token: string,  // UUID token
})
// Returns: uuid (org id)
// Throws on: invalid/expired token, email mismatch
```

---

## Supabase Auth Methods (called from app)

```typescript
// Login
supabase.auth.signInWithPassword({ email, password })

// Signup
supabase.auth.signUp({ email, password, options: { data: { full_name } } })

// Logout
supabase.auth.signOut()

// Get current user (validates JWT with Supabase Auth server)
supabase.auth.getUser()

// PKCE code exchange (auth callback)
supabase.auth.exchangeCodeForSession(code)
```

---

## Supabase Table Queries

### Profiles
```typescript
supabase.from("profiles")
  .select("id, full_name, avatar_url, is_super_admin")
  .eq("id", userId)
  .single()
```

### Organization Members
```typescript
supabase.from("organization_members")
  .select("role, organization:organizations(id, name, slug, is_super_admin_org)")
  .eq("user_id", userId)
```

### CRM Contacts
```typescript
// List
supabase.from("crm_contacts")
  .select("id, full_name, email, phone, company, status, created_at")
  .eq("organization_id", orgId)
  .order("created_at", { ascending: false })
  .limit(200)

// Insert
supabase.from("crm_contacts")
  .insert({ organization_id, full_name, email, phone, company, created_by })
  .select("id").single()
```

### Knowledge Base Documents
```typescript
// List
supabase.from("knowledge_base_documents")
  .select("id, title, status, language, updated_at")
  .eq("organization_id", orgId)
  .order("updated_at", { ascending: false })
  .limit(100)

// Insert
supabase.from("knowledge_base_documents")
  .insert({ organization_id, title, content, language, status: "published", created_by })
  .select("id").single()

// Delete (on embedding failure)
supabase.from("knowledge_base_documents")
  .delete()
  .eq("id", docId)
```

### Knowledge Base Chunks
```typescript
// Delete for re-ingestion
supabase.from("knowledge_base_chunks")
  .delete()
  .eq("document_id", documentId)

// Batch insert
supabase.from("knowledge_base_chunks")
  .insert([{ document_id, organization_id, content, embedding }])
```

### Audit Logs
```typescript
// List
supabase.from("audit_logs")
  .select("id, action, target_type, target_id, created_at")
  .eq("organization_id", orgId)
  .order("created_at", { ascending: false })
  .limit(50)

// Insert (via logAuditEvent)
supabase.from("audit_logs")
  .insert({ organization_id, actor_id, action, target_type, target_id, metadata })
```

### Usage Events
```typescript
// List for aggregation
supabase.from("usage_events")
  .select("event_type, quantity")
  .eq("organization_id", orgId)
  .limit(10000)

// Insert (via logUsageEvent)
supabase.from("usage_events")
  .insert({ organization_id, actor_id, event_type, quantity })
```

### Organization Invites
```typescript
// List pending invites (admin view)
supabase.from("organization_invites")
  .select("id, email, role")
  .eq("organization_id", orgId)
  .eq("status", "pending")
  .limit(50)

// Insert new invite
supabase.from("organization_invites")
  .insert({ organization_id, email, role, invited_by })

// Revoke
supabase.from("organization_invites")
  .update({ status: "revoked" })
  .eq("id", inviteId)
  .eq("organization_id", orgId)
```

### Organizations (Super Admin only)
```typescript
supabase.from("organizations")
  .select("id, name, slug, created_at")
  .order("created_at", { ascending: false })
```

### Organization Members (Settings)
```typescript
// List members with profile names
supabase.from("organization_members")
  .select("id, role, profile:profiles(id, full_name)")
  .eq("organization_id", orgId)
  .limit(100)

// Update role
supabase.from("organization_members")
  .update({ role })
  .eq("id", memberId)
  .eq("organization_id", orgId)

// Delete (remove member)
supabase.from("organization_members")
  .delete()
  .eq("id", memberId)
  .eq("organization_id", orgId)
```
