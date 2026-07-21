# API Inventory — Eunoia AI OS

---

## Route Handlers (Next.js App Router)

### Health & Observability

| Endpoint | Method | Auth | Rate Limit | Caching | Status |
|----------|--------|------|------------|---------|--------|
| `/api/live` | GET | None | None | no-store | ✅ Production Ready |
| `/api/health` | GET | None | None | 30s (HIT/MISS) | ✅ Production Ready |
| `/api/metrics` | GET | Bearer token (optional) | None | no-store | ⚠️ Open if METRICS_TOKEN unset |
| `/api/admin/system` | GET | Supabase session | None | no-store | ✅ Production Ready |

### CRM

| Endpoint | Method | Auth | Rate Limit | Status |
|----------|--------|------|------------|--------|
| `/api/crm/import` | POST | Session + org membership | None | ✅ Ready |
| `/api/crm/export` | GET | Session + org membership | None | ✅ Ready |
| `/api/crm/insights` | POST | Session + org membership | 10/hr/user | ✅ Ready |

### Auth

| Endpoint | Method | Auth | Status |
|----------|--------|------|--------|
| `/auth/callback` | GET | None (PKCE token in URL) | ✅ Ready |

---

## Server Actions (Grouped by Domain)

### Authentication (`src/lib/auth/actions.ts`)
| Action | Input Validation | Guards | Audit | Status |
|--------|-----------------|--------|-------|--------|
| `login` | Zod (email, password) | None (public) | — | ✅ |
| `signup` | Zod (email, password, name) | None (public) | — | ✅ |
| `logout` | None | None | — | ✅ |
| `requestPasswordReset` | Zod (email) | None (public) | — | ✅ |
| `updatePassword` | Zod (password) | Session required | — | ✅ |

### Onboarding (`src/app/onboarding/actions.ts`)
| Action | Input | Guards | Status |
|--------|-------|--------|--------|
| `createOrganization` | Zod (name) | `verifySession` | ✅ |

### CRM Contacts (`src/app/dashboard/crm/actions.ts`)
| Action | Input | Guards | Audit | Status |
|--------|-------|--------|-------|--------|
| `createContact` | contactSchema (9 fields) | session + org | ✅ | ✅ |
| `updateContact` | contactSchema | session + org | ✅ | ✅ |
| `updateContactStage` | CrmPipelineStage | session + org | ✅ | ✅ |
| `softDeleteContact` | contactId | requireAdmin | ✅ | ✅ |
| `restoreContact` | contactId | requireAdmin | ✅ | ✅ |
| `hardDeleteContact` | contactId | requireAdmin | ✅ | ✅ |
| `deleteContact` | contactId | requireAdmin | — | ⚠️ Alias |
| `archiveContact` | contactId | session + org | ✅ | ✅ |
| `unarchiveContact` | contactId | session + org | ✅ | ✅ |

### CRM Tags
| Action | Input | Guards | Status |
|--------|-------|--------|--------|
| `createTag` | tagSchema (name, color) | session + org | ✅ |
| `assignTag` | contactId, tagId | session + org | ✅ |
| `removeTag` | contactId, tagId | session + org | ✅ |
| `deleteTag` | tagId | requireAdmin | ✅ |

### CRM Timeline
| Action | Input | Guards | Status |
|--------|-------|--------|--------|
| `createTimelineEvent` | contactId + timelineSchema | session + org | ✅ |
| `deleteTimelineEvent` | contactId, eventId | session + org | ✅ |

### CRM Activities
| Action | Input | Guards | Status |
|--------|-------|--------|--------|
| `createActivity` | activitySchema | session + org | ✅ |
| `completeActivity` | activityId | session + org | ✅ |
| `deleteActivity` | activityId | session + org | ✅ |

### Knowledge Base (`src/app/dashboard/knowledge-base/actions.ts`)
| Action | Input | Guards | Status |
|--------|-------|--------|--------|
| `createDocument` | documentSchema | session + org | ✅ |
| `deleteDocument` | documentId | session + org + creator check | ✅ |
| `updateDocument` | — | — | ❌ NOT IMPLEMENTED |

### AI Assistant (`src/app/dashboard/assistant/actions.ts`)
| Action | Input | Guards | Status |
|--------|-------|--------|--------|
| `askAssistant` | question (string) | session + org + rate limit | ✅ |

### Settings (`src/app/dashboard/settings/actions.ts`)
| Action | Input | Guards | Status |
|--------|-------|--------|--------|
| `createInvite` | inviteSchema | Permission: ORG_MEMBERS_INVITE | ✅ |
| `revokeInvite` | inviteId | Permission: ORG_INVITES_REVOKE | ✅ |
| `updateMemberRole` | userId, role | Permission: ORG_MEMBERS_ROLES | ✅ |
| `removeMember` | userId | Permission: ORG_MEMBERS_REMOVE | ✅ |
| `updateOrgSettings` | OrgSettings (partial) | Permission: ORG_SETTINGS_WRITE | ✅ |

### Org Switcher (`src/app/dashboard/org-switcher-actions.ts`)
| Action | Input | Guards | Status |
|--------|-------|--------|--------|
| `switchOrganization` | orgId | session + membership validation | ✅ |

---

## Missing APIs (Gap Analysis)

| Missing Endpoint | Priority | Notes |
|-----------------|----------|-------|
| `PUT /api/crm/contacts/[id]` | — | Covered by Server Action |
| `POST /api/billing/checkout` | P0 | Stripe checkout session |
| `POST /api/billing/webhook` | P0 | Stripe webhook handler |
| `GET /api/billing/portal` | P1 | Customer portal redirect |
| `POST /api/kb/upload` | P1 | File upload endpoint |
| `PUT /api/kb/documents/[id]` | P1 | Edit + re-ingest |
| `GET /api/assistant/stream` | P1 | Streaming RAG |
| `GET /api/usage/quota` | P2 | Current quota usage |
