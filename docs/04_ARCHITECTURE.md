# 04 — Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          BROWSER                                  │
│  Client Components (React 19): chat.tsx, contact-form.tsx,       │
│  document-form.tsx, invite-form.tsx, member-row.tsx,             │
│  invite-row.tsx, nav-link.tsx, usage-chart.tsx, status-chart.tsx │
└──────────────────────┬──────────────────────────────────────────┘
                        │  HTTPS
┌──────────────────────▼──────────────────────────────────────────┐
│                     VERCEL EDGE                                   │
│  proxy.ts (Next.js 16 Proxy / formerly Middleware)               │
│  ─ Session refresh (updateSession)                               │
│  ─ Route protection: redirect unauthenticated → /login           │
│  ─ Redirect authenticated from /login,/signup → /dashboard       │
└──────────────────────┬──────────────────────────────────────────┘
                        │
┌──────────────────────▼──────────────────────────────────────────┐
│              NEXT.JS APP ROUTER (Vercel Functions)               │
│                                                                   │
│  Server Components    │   Server Actions      │   Route Handlers  │
│  ─ pages (RSC)        │   ─ login/signup      │   ─ /api/health   │
│  ─ layouts            │   ─ createContact     │   ─ /auth/callback│
│  ─ DAL calls          │   ─ createDocument    │                   │
│                        │   ─ askAssistant      │                   │
│                        │   ─ createInvite      │                   │
│                        │   ─ updateMemberRole  │                   │
│                        │   ─ removeMember      │                   │
│                        │   ─ createOrganization│                   │
└───────────┬────────────────────────┬──────────────────────────────┘
            │                        │
   ┌────────▼────────┐     ┌────────▼────────────┐
   │    SUPABASE      │     │      OPENAI API       │
   │  ─ PostgreSQL    │     │  ─ text-embedding-   │
   │  ─ Auth          │     │    3-small (1536d)   │
   │  ─ pgvector      │     │  ─ gpt-4o-mini       │
   │  ─ RLS           │     │  Timeout: 30s        │
   │  ─ RPCs          │     │  Max retries: 2      │
   └─────────────────┘     └─────────────────────┘
```

## Component Diagram

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts, metadata, dark mode)
│   ├── page.tsx                  # Landing page [PUBLIC]
│   ├── globals.css               # Tailwind v4, CSS vars, glass-panel, kpi-card
│   ├── error.tsx                 # Global error boundary [CLIENT]
│   ├── manifest.ts               # PWA manifest
│   ├── sitemap.ts                # XML sitemap generator
│   ├── favicon.ico               # Favicon (default Next.js icon)
│   │
│   ├── login/page.tsx            # Login form [PUBLIC, CLIENT]
│   ├── signup/page.tsx           # Signup form [PUBLIC, CLIENT]
│   ├── onboarding/               # Org creation [PROTECTED]
│   │   ├── page.tsx              # Form [CLIENT]
│   │   └── actions.ts            # createOrganization() [SERVER]
│   ├── invite/page.tsx           # Invite acceptance [PROTECTED, SERVER]
│   │
│   ├── auth/callback/route.ts    # PKCE exchange [PUBLIC, ROUTE HANDLER]
│   │
│   ├── api/
│   │   └── health/route.ts       # Health check [PUBLIC, ROUTE HANDLER]
│   │
│   └── dashboard/                # All protected routes
│       ├── layout.tsx            # Dashboard shell, sidebar, auth guard [SERVER]
│       ├── page.tsx              # Overview KPIs + charts [SERVER]
│       ├── loading.tsx           # Loading state
│       ├── nav-link.tsx          # Sidebar nav item [CLIENT]
│       ├── usage-chart.tsx       # Recharts AreaChart [CLIENT]
│       ├── status-chart.tsx      # Recharts PieChart [CLIENT]
│       │
│       ├── crm/
│       │   ├── page.tsx          # Contact list [SERVER]
│       │   ├── contact-form.tsx  # Add contact form [CLIENT]
│       │   ├── actions.ts        # createContact() [SERVER ACTION]
│       │   ├── error.tsx         # Error boundary [CLIENT]
│       │   └── loading.tsx
│       │
│       ├── knowledge-base/
│       │   ├── page.tsx          # Document list [SERVER]
│       │   ├── document-form.tsx # Add document form [CLIENT]
│       │   ├── actions.ts        # createDocument() [SERVER ACTION]
│       │   ├── error.tsx         # Error boundary [CLIENT]
│       │   └── loading.tsx
│       │
│       ├── assistant/
│       │   ├── page.tsx          # Page shell [SERVER]
│       │   ├── chat.tsx          # Chat UI [CLIENT]
│       │   ├── actions.ts        # askAssistant() [SERVER ACTION]
│       │   └── loading.tsx
│       │
│       ├── audit-logs/
│       │   ├── page.tsx          # Log table [SERVER]
│       │   └── loading.tsx
│       │
│       ├── usage/
│       │   ├── page.tsx          # Usage totals [SERVER]
│       │   └── loading.tsx
│       │
│       ├── settings/
│       │   ├── page.tsx          # Members + invite [SERVER]
│       │   ├── invite-form.tsx   # Send invite [CLIENT]
│       │   ├── invite-row.tsx    # Revoke invite [CLIENT]
│       │   ├── member-row.tsx    # Change role / remove [CLIENT]
│       │   ├── actions.ts        # createInvite, revokeInvite, updateMemberRole, removeMember, acceptInvite [SERVER]
│       │   ├── error.tsx
│       │   └── loading.tsx
│       │
│       └── admin/
│           ├── page.tsx          # Super admin org list [SERVER]
│           └── loading.tsx
│
└── lib/                          # Shared library code (all server-only except types/utils)
    ├── ai/
    │   ├── openai.ts             # [SERVER-ONLY] OpenAI client + embed functions
    │   ├── chunk.ts              # chunkText() — pure, testable
    │   ├── ingest.ts             # [SERVER-ONLY] ingestDocument()
    │   └── chunk.test.ts         # Vitest unit tests
    ├── auth/
    │   ├── dal.ts                # [SERVER-ONLY] verifySession, getProfile, getMemberships, getActiveOrganization
    │   ├── actions.ts            # login(), signup(), logout() [SERVER ACTIONS]
    │   └── audit.ts             # [SERVER-ONLY] logAuditEvent, logUsageEvent
    ├── supabase/
    │   ├── client.ts             # Browser Supabase client
    │   ├── server.ts             # Server Supabase client (cookies)
    │   └── proxy.ts             # updateSession() for proxy.ts
    ├── env.ts                    # [SERVER-ONLY] Validated env vars
    ├── logger.ts                 # Structured JSON logger
    ├── types.ts                  # Shared TS types + hasRole() + ROLE_RANK
    ├── utils.ts                  # slugify()
    ├── types.test.ts             # Vitest unit tests
    └── utils.test.ts             # Vitest unit tests
```

## Proxy (Route Protection)

```
proxy.ts
  export function proxy(request)
    └── updateSession(request)        ← src/lib/supabase/proxy.ts
          ├── createServerClient (reads request cookies)
          ├── supabase.auth.getUser() ← validates JWT with Supabase
          ├── if !user AND !publicRoute → redirect /login
          ├── if user AND (path == /login OR /signup) → redirect /dashboard
          └── return supabaseResponse  ← with refreshed cookies set

PUBLIC_ROUTES = ["/login", "/signup", "/auth/callback", "/"]
```

## Data Access Layer (DAL)

All DAL functions are:
- Server-only (`import "server-only"`)
- Wrapped in `React.cache()` for per-request deduplication
- Called from Server Components and Server Actions

```
verifySession()
  └── supabase.auth.getUser()
      ├── if no user → redirect("/login")
      └── return { userId, email }

getProfile()
  └── verifySession()
      └── SELECT id, full_name, avatar_url, is_super_admin FROM profiles WHERE id = userId

getMemberships()
  └── verifySession()
      └── SELECT role, organization{id,name,slug,is_super_admin_org}
          FROM organization_members WHERE user_id = userId

getActiveOrganization()
  └── getMemberships()
      └── return memberships[0] ?? null   ← ALWAYS FIRST ORG (no switcher)
```

## Authorization Flow

```
Request arrives
    │
    ▼
proxy.ts: Is user logged in? (JWT check)
    │ NO → redirect /login
    │ YES ↓
    ▼
Server Component / Server Action: verifySession()
    │ NO SESSION → redirect /login
    │ YES ↓
    ▼
Server Component: loads data via authenticated Supabase client
    │
    ▼
Supabase: RLS policies evaluate
    ├── is_org_member(org_id) — user must be in organization
    ├── org_role(org_id) — owner/admin for destructive ops
    └── is_super_admin() — platform-wide access
```

## Supabase Client Selection

| Context | Client | File |
|---------|--------|------|
| Server Components | `createClient()` | `src/lib/supabase/server.ts` |
| Server Actions | `createClient()` | `src/lib/supabase/server.ts` |
| Route Handlers | `createClient()` | `src/lib/supabase/server.ts` |
| Browser / Client Components | `createClient()` | `src/lib/supabase/client.ts` |
| Proxy (token refresh) | `createServerClient` directly | `src/lib/supabase/proxy.ts` |
| Integration scripts | `createClient` from supabase-js | with `SUPABASE_SERVICE_ROLE_KEY` |

The server client uses `@supabase/ssr` → `createServerClient`. It reads cookies from the Next.js `cookies()` store and writes refreshed session cookies back. The browser client uses `createBrowserClient` which reads from browser cookies automatically.

## Form Patterns

All interactive forms follow the same React 19 pattern:

```typescript
// Client Component
const [state, action, pending] = useActionState(serverAction, undefined)
return <form action={action}>...</form>

// Server Action
export async function serverAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await verifySession()
  const membership = await getActiveOrganization()
  // validate with Zod
  // perform DB operation
  // fire-and-forget audit/usage
  // revalidatePath(...)
}
```

Exception: `MemberRow` and `InviteRow` use `useTransition` + direct server action calls (not form submission) for inline table interactions.
