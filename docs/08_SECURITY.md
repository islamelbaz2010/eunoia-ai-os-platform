# 08 — Security

## Threat Model

**Application type**: Multi-tenant SaaS with organizational data isolation.

**Key threats**:
1. Unauthenticated access to protected routes
2. Cross-organization data access (tenant isolation breach)
3. Privilege escalation (viewer acting as admin)
4. Invite token abuse (accepting someone else's invite)
5. Injection attacks (SQL, prompt injection)
6. Clickjacking and XSS
7. Secret leakage (API keys in client bundles)

---

## Defense-in-Depth Layers

### Layer 1: HTTPS / Transport (Vercel)
- All traffic is HTTPS (Vercel enforces)
- HSTS header: `max-age=63072000; includeSubDomains; preload` (2-year HSTS)

### Layer 2: Proxy (Session Gate)
**File**: `proxy.ts` + `src/lib/supabase/proxy.ts`

- Intercepts every request (matcher: all paths except static assets)
- Calls `supabase.auth.getUser()` to validate JWT
- Unauthenticated requests to protected routes → redirect `/login`
- Authenticated requests to `/login` or `/signup` → redirect `/dashboard`

**Important**: This is a convenience layer, not the security boundary. It can be bypassed if Next.js is configured incorrectly. The real boundary is RLS.

### Layer 3: Data Access Layer (verifySession)
**File**: `src/lib/auth/dal.ts`

- Every Server Action and relevant Server Component calls `verifySession()` first
- `verifySession()` calls `supabase.auth.getUser()` which validates the JWT against Supabase Auth (not local cookie parsing)
- Returns `{ userId, email }` or redirects to `/login`

### Layer 4: Row Level Security (Source of Truth)
**Files**: `supabase/migrations/0001–0006`

RLS is the **actual security boundary**. Even if layers 1–3 are bypassed, RLS ensures:
- Users can only see their org's data
- Only admins/owners can perform destructive operations
- Invites can only be accepted by the email address they were issued to
- Super admin flag cannot be self-set (no INSERT/UPDATE policy for `is_super_admin`)

**Helper functions** (all STABLE, SECURITY DEFINER):
```sql
is_org_member(org_id)  → checks organization_members for auth.uid()
org_role(org_id)        → returns role of auth.uid() in org
is_super_admin()        → checks profiles.is_super_admin for auth.uid()
```

### Layer 5: HTTP Security Headers
**File**: `next.config.ts`

```
X-Frame-Options: DENY                              ← clickjacking prevention
X-Content-Type-Options: nosniff                    ← MIME type sniffing prevention
Referrer-Policy: strict-origin-when-cross-origin   ← referrer leak prevention
Permissions-Policy: camera=(), microphone=(), geolocation=()  ← API lockdown
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: (see below)
```

**CSP (production)**:
```
default-src 'self'
script-src 'self' 'unsafe-inline'
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob:
font-src 'self' data:
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
```

**Development only** (`unsafe-eval` added): Required by Turbopack's HMR runtime.

### Layer 6: Input Validation
**Library**: Zod v4

All Server Actions validate inputs before touching the database:
- `login()`: email (valid email), password (≥8 chars)
- `signup()`: name (≥2 chars), email, password
- `createContact()`: fullName (2–100), email (optional valid email), phone (≤30), company (≤100)
- `createDocument()`: title (2–200), content (10–50,000), language (enum)
- `askAssistant()`: question (3–500, trimmed)
- `createInvite()`: email (valid), role (enum)
- `createOrganization()`: name (2–80, trimmed)

### Layer 7: Server-Only Enforcement
Files with `import "server-only"` at the top:
- `src/lib/ai/openai.ts`
- `src/lib/ai/ingest.ts`
- `src/lib/auth/audit.ts`
- `src/lib/auth/dal.ts`
- `src/lib/env.ts`
- `src/lib/supabase/server.ts`

The Next.js compiler will throw a build error if any of these are accidentally imported in a Client Component. This prevents API keys from appearing in browser bundles.

---

## RBAC System

### Roles (ordered by privilege)

| Role | Value | Capabilities |
|------|-------|-------------|
| viewer | 0 | Read all org data |
| member | 1 | Read all + write CRM, KB; cannot manage members |
| admin | 2 | Everything member can do + invite/remove members, change roles |
| owner | 3 | Everything admin can do + assign owner role, cannot be removed by admins |

### `hasRole()` Function
**File**: `src/lib/types.ts`

```typescript
export const ROLE_RANK: Record<OrgRole, number> = {
  viewer: 0, member: 1, admin: 2, owner: 3,
}
export function hasRole(role: OrgRole, minimum: OrgRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum]
}
```

Used in `settings/actions.ts` to check if the caller is at least admin:
```typescript
if (!hasRole(membership.role, "admin")) throw new Error("Permission denied")
```

### Super Admin

- `profiles.is_super_admin = true` grants platform-wide access
- Super admins bypass all org-scoped RLS policies
- Super admins can access `/dashboard/admin` (lists all orgs)
- Super admins can access the dashboard without any org membership
- The `is_super_admin` flag can **only be set directly in the database** — there is no API endpoint or UI to self-promote. This is intentional.

---

## Invite Security

### Token Properties
- Token is a UUID (`gen_random_uuid()`)
- Stored in `organization_invites.token`
- Expires in 14 days (`expires_at = now() + interval '14 days'`)
- Statuses: pending → accepted OR revoked (manual) OR expired (temporal)

### Email Binding
The `accept_org_invite(invite_token)` RPC validates:
1. Token exists and is `pending`
2. `expires_at > now()`
3. **`invite.email = auth.users.email` for the calling user** — you cannot accept an invite meant for someone else

### Race Condition Fix (migration 0006)
The original `accept_org_invite` had a TOCTOU race: two concurrent calls with the same token could both read `status='pending'` before either write. Migration 0006 adds `FOR UPDATE` to the invite SELECT, serializing concurrent calls.

---

## Prompt Injection

The RAG assistant is a potential prompt injection vector: a malicious document in the KB could attempt to override the system prompt.

**Current mitigations**:
- System prompt placed first, user content second
- Context is clearly labeled: `"Context:\n...\n\nQuestion: ..."`
- `MAX_ANSWER_TOKENS = 1024` limits response surface
- GPT-4o-mini is generally robust to basic prompt injection
- RLS ensures context only includes the org's own documents (no cross-org injection)

**Not mitigated**:
- Sophisticated indirect prompt injection via KB documents
- No content filtering on KB documents before storage

---

## Secret Management

| Secret | Where | Exposed client-side? |
|--------|-------|---------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` + Vercel | YES (intentional, required for browser Supabase client) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` + Vercel | YES (intentional, safe — RLS restricts what anon key can do) |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` only | NO — never used in Next.js app code, scripts only |
| `OPENAI_API_KEY` | `.env.local` + Vercel | NO — `import "server-only"` enforced |

The `SUPABASE_SERVICE_ROLE_KEY` is **not** used anywhere in the application. It is only used by `scripts/test-rag.js` (local validation). This is correct.

---

## Error Message Policy

Errors never expose internal implementation details to the browser:
- Error boundaries display `error.digest` (a hash) not `error.message`
- Server Action errors return user-friendly strings, not DB error messages (e.g., "Failed to load CRM" not Postgres constraint violation text)
- The `/invite/page.tsx` shows "Invite invalid or expired" regardless of the specific error

The one exception was `invite/page.tsx` in an earlier version which exposed raw Supabase error text. This was fixed as part of the production hardening.

---

## Known Security Gaps

1. **No rate limiting**: Login, signup, and RAG queries have no rate limiting at the application layer. Supabase Auth has built-in rate limits for auth endpoints, but the RAG `askAssistant()` action could be abused (expensive AI calls).

2. **No CSRF protection**: Next.js Server Actions use the `Origin` header check by default in Next.js. This is the framework's built-in CSRF protection and is present.

3. **No email verification enforcement**: After signup, users are immediately redirected to `/dashboard`. If Supabase is configured to require email verification, this redirect will fail gracefully (session won't be valid). If email verification is disabled, users land directly in the app. Current behavior depends on Supabase project configuration.

4. **No password reset**: There is no "Forgot password" flow implemented. Users who forget their password have no self-service path.

5. **Invite tokens not emailed**: Invite tokens must be manually shared. This is a UX issue but also a security property — it prevents automated phishing if email isn't configured.

6. **Super admin flag is permanent**: There's no UI to revoke super admin status. Must be done directly in the database.
