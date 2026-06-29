# Multi-Tenant Architecture — Eunoia AI OS

**Date**: 2026-06-29  
**Sprint**: 4 — Enterprise Multi-Tenant Core

---

## Tenant Model

Eunoia AI OS uses a **shared-database, shared-schema** multi-tenant architecture with strict row-level isolation enforced by PostgreSQL RLS.

```
Platform (Eunoia AI OS)
  └── Organization (Tenant)
        ├── Settings (branding, locale, AI config)
        ├── Members (users with roles)
        │     └── Member Permissions (overrides)
        ├── Invitations
        ├── CRM Contacts
        ├── Knowledge Base (documents + chunks + embeddings)
        ├── Audit Logs
        └── Usage Events
```

---

## Organization Lifecycle

```
[new user signs up]
       ↓
[onboarding: create_organization RPC]
  → INSERT organizations (status: active)
  → INSERT organization_members (role: owner)
       ↓
[active organization]
  → Members join via invite (accept_org_invite RPC)
  → Members are managed by admins/owners
  → Settings are updated via update_organization_settings RPC
       ↓
[optional: ownership transfer]
  → transfer_org_ownership(org_id, new_owner_id)
  → Caller demoted to admin; new owner promoted
       ↓
[optional: archive]
  → archive_organization(org_id)
  → status = 'archived', archived_at = now()
  → Org hidden from active switcher; data preserved
       ↓
[optional: restore]
  → restore_organization(org_id)
  → status = 'active', archived_at = NULL
```

---

## Tenant Isolation Strategy

**Layer 1: Database (RLS)**
Every table has RLS enabled. Every SELECT, INSERT, UPDATE, DELETE is gated by:
- `public.is_org_member(organization_id)` — user must be a member of that org
- `public.org_role(organization_id)` — role check for admin-level operations
- `public.is_super_admin()` — platform-level bypass

**Layer 2: DAL (Data Access Layer)**
`getActiveOrganization()` in `dal.ts` resolves the active org from:
1. Cookie `eunoia-active-org` (user's explicit selection, validated against memberships)
2. First active membership (fallback)

The DAL never accepts a caller-supplied `organization_id`. All org IDs come from the authenticated membership.

**Layer 3: Server Actions**
Every Server Action calls `verifySession()` + `getActiveOrganization()` before any DB operation. The `organization_id` used in queries is always `membership.organization.id`, never from `formData` or client input.

**Layer 4: Authorization**
`AuthorizationService.require(membership, permission)` enforces role-based + member-level permission checks before any business logic runs.

---

## Workspace Switching

Multi-org users can switch context without a full page reload:

```
User selects org from OrgSwitcher dropdown
  ↓
Client: onChange → startTransition(() => switchOrganization(orgId))
  ↓
Server Action: switchOrganization(orgId)
  → verifySession()
  → getMemberships()  (cached)
  → Validate orgId in memberships AND org is active
  → Set cookie: eunoia-active-org = orgId (httpOnly, secure, 30d)
  → revalidatePath('/dashboard', 'layout')
  → redirect('/dashboard')
  ↓
Next request: getActiveOrganization() reads cookie → returns new org
```

**Security properties**:
- Cookie is `httpOnly` (no JS access) + `secure` (HTTPS only in production)
- Cookie value is always validated against live DB memberships — a stale/forged value is silently ignored
- Archived orgs are never returned as active context

---

## Organization Settings Schema

Settings are stored as typed JSONB in `organizations.settings`:

```typescript
type OrgSettings = {
  branding?: {
    primaryColor?: string;   // e.g. "#4f46e5"
    logoUrl?: string | null;
  };
  locale?: {
    timezone?: string;       // e.g. "America/New_York"
    language?: string;       // e.g. "en"
    currency?: string;       // e.g. "USD"
    dateFormat?: string;     // e.g. "MM/DD/YYYY"
    numberFormat?: string;   // e.g. "1,234.56"
  };
  business?: {
    country?: string;        // ISO 3166-1 alpha-2
    businessType?: string;   // e.g. "hospitality"
    businessHours?: string | null;
  };
  ai?: {
    systemPromptPrefix?: string | null;  // Custom AI persona
    ragMinSimilarity?: number;           // Default: 0.3
    maxQueriesPerHour?: number;          // Default: 50
  };
  notifications?: {
    emailOnInvite?: boolean;
    emailOnMemberRemoval?: boolean;
  };
};
```

JSONB is chosen over separate columns to allow settings to evolve without migrations.

---

## Database Schema (Sprint 4 additions)

```sql
-- Extended role enum
org_role: guest | viewer | editor | member | operator | manager | admin | super_admin | owner

-- New org_status enum
org_status: active | archived | suspended

-- organizations (extended)
+ status           org_status DEFAULT 'active'
+ archived_at      timestamptz
+ subscription_tier text DEFAULT 'free'
+ settings         jsonb DEFAULT '{}'
+ metadata         jsonb DEFAULT '{}'

-- permissions (new — registry)
key: text PK
description: text
category: text

-- role_permissions (new — defaults)
role: org_role
permission_key: text → permissions.key
PRIMARY KEY (role, permission_key)

-- member_permissions (new — overrides)
organization_id: uuid → organizations.id
user_id: uuid → profiles.id
permission_key: text → permissions.key
granted: boolean
granted_by: uuid → profiles.id

-- organization_members (extended)
+ updated_at  timestamptz DEFAULT now()

-- organization_invites (extended)
+ resend_count    int DEFAULT 0
+ last_resent_at  timestamptz
```

---

## Future Architecture (Roadmap)

### White Label Support
Organizations can have custom domains and branding via:
- `organizations.settings.branding.primaryColor` (already supported)
- `organizations.settings.branding.logoUrl` (already supported)
- Future: `organizations.custom_domain` column + DNS verification flow

### Multi-Region
- Supabase project per region with data residency
- Active org stored in cookie — region could be part of org metadata
- No code changes required: the architecture is region-agnostic

### Enterprise Customers (B2B)
- Org hierarchy: `parent_org_id` FK allows business units within enterprise accounts
- Future: `org_type: organization | business_unit | team | department`
- Already supported: unlimited orgs per user, unlimited members per org

### Custom Roles (Phase 5+)
- `org_role` enum + `role_permissions` seeding allows adding new roles without code changes
- Future: a UI for creating custom role templates stored as JSONB

### Stripe Billing Integration
- `organizations.subscription_tier` is already in the schema
- `billing.manage` and `billing.read` permissions are already defined
- No schema migrations required when Stripe is integrated

### AI Agents (Phase 8+)
- Agents will be members of organizations with a dedicated `agent` role
- Permission system applies identically to human and AI members
- Future: `member_type: human | agent` column on `organization_members`

---

## Audit Trail

Every significant action generates an audit log entry:

| Action | When |
|--------|------|
| `organization.settings_updated` | Org name or settings changed |
| `organization.ownership_transferred` | Ownership transfer |
| `organization.archived` | Org archived |
| `organization_invite.created` | New invite sent |
| `organization_invite.revoked` | Invite revoked |
| `organization_invite.resent` | Invite resent |
| `organization_member.role_updated` | Member role changed |
| `organization_member.removed` | Member removed |
| `crm_contact.created` / `.deleted` | Contact lifecycle |
| `kb_document.created` / `.deleted` | Document lifecycle |

Audit logs are:
- **Immutable**: No UPDATE/DELETE RLS policy on `audit_logs`
- **Fire-and-forget**: Never block a user operation
- **Scoped**: Always tagged with `organization_id` + `actor_id`
