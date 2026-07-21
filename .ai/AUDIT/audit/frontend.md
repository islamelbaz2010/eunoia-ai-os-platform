# Frontend Audit — Eunoia AI OS

---

## Pages Inventory

| Route | Type | Loading | Error | Status |
|-------|------|---------|-------|--------|
| `/` | RSC | — | — | ✅ Static landing |
| `/login` | Client | — | — | ✅ |
| `/signup` | Client | — | — | ✅ |
| `/auth/forgot-password` | Client | — | — | ✅ |
| `/auth/update-password` | Client | — | — | ✅ |
| `/invite` | Client | — | — | ✅ |
| `/onboarding` | Client | — | — | ✅ |
| `/dashboard` | RSC | ✅ | ✅ | ✅ |
| `/dashboard/crm` | RSC | ✅ | ✅ | ✅ |
| `/dashboard/crm/[id]` | RSC | ✅ | — | ✅ |
| `/dashboard/crm/pipeline` | RSC | — | — | ✅ |
| `/dashboard/crm/import` | Client | — | — | ✅ |
| `/dashboard/crm/activities` | RSC+Client | — | — | ✅ |
| `/dashboard/knowledge-base` | RSC | ✅ | ✅ | ✅ |
| `/dashboard/assistant` | RSC+Client | ✅ | ✅ | ✅ |
| `/dashboard/audit-logs` | RSC | ✅ | ✅ | ✅ |
| `/dashboard/usage` | RSC | ✅ | ✅ | ✅ |
| `/dashboard/settings` | RSC | ✅ | ✅ | ✅ |
| `/dashboard/admin` | RSC | ✅ | ✅ | ✅ (super-admin only) |

---

## React Patterns

### ✅ Correct React 19 Usage
- `useActionState` used throughout (not deprecated `useFormState`)
- Server Components as default, client components only where needed
- `"use client"` appropriately scoped to interactive components only

### ✅ Error Boundaries
- `src/app/error.tsx` — route-level error boundary with Sentry capture
- `src/app/global-error.tsx` — root-level with inline styles (no CSS loading guarantee)
- Per-section error files in dashboard routes

### ✅ Loading States
- Most dashboard sections have `loading.tsx` skeleton files
- Missing: `/dashboard/crm/[id]/` only has loading, no error boundary

---

## Component Architecture

### Client Components (requiring interactivity)
- `login/page.tsx`, `signup/page.tsx` — form state
- `chat.tsx` — assistant chat interface
- `pipeline-board.tsx` — drag-and-drop
- `contact-row.tsx` — delete button interaction
- `document-row.tsx` — delete button interaction
- `quick-add-contact.tsx` — form dialog
- `edit-contact-modal.tsx` — modal form
- `contact-timeline.tsx`, `contact-activities.tsx`, `contact-tags.tsx` — interactive lists
- `csv-importer.tsx` — file parsing in browser
- `org-switcher.tsx` — select + server action
- `activities-client.tsx` — complete/delete actions

### Server Components (data fetching)
- All page.tsx files
- `dashboard/layout.tsx`
- `dashboard/admin/page.tsx`

---

## Accessibility

### ⚠️ Issues Found
- No `aria-*` attributes on custom interactive elements (pipeline board, contact cards)
- No focus management on modal open/close (EditContactModal)
- No skip-to-main-content link
- Color-only status indicators (pipeline stage colors with no text backup)
- No keyboard navigation testing evident

### ✅ Correct Usage
- `<label>` elements associated with form inputs via `htmlFor`/`id`
- `required` attributes on required form fields
- `disabled` state on submit buttons during pending state
- `aria-label` on org switcher select

---

## Design System

### Tailwind v4 ✅
- `@import "tailwindcss"` syntax (not v3 `@tailwind base`)
- CSS custom properties for design tokens
- Dark-only theme (no light mode toggle)
- `glass-panel`, `kpi-card` utility classes defined

### ⚠️ No Component Library
Pure Tailwind + custom CSS. No shadcn/ui, Radix, or headless UI. Means:
- No accessible dialog/modal primitives
- No accessible combobox for role selection
- Inconsistent interactive patterns

### Sonner Toast ✅
- Positioned `bottom-right`, richColors, closeButton
- Used throughout for success/error feedback

---

## Performance

### ✅ Good Patterns
- Server Components for all data-heavy views (no client-side fetching)
- `Promise.all` for parallel data fetching on dashboard
- `revalidatePath()` for targeted cache busting (not full page invalidation)

### ⚠️ Issues
- `getUsageOverTime()` fetches 2000 rows, aggregates in JS — should be SQL
- No `<Image>` optimization (no images beyond favicon)
- No ISR — all pages are dynamic (SSR on every request)
- No bundle analysis has been run
- Recharts loaded for all dashboard visitors even if no data

### Missing
- Pagination on all list views (CRM, KB, audit logs, team members)
- Virtual scrolling for large contact lists
- Skeleton loading for CRM pipeline board

---

## SEO

### ✅ Present
- `sitemap.ts` — generates sitemap for public pages
- `robots.txt` — blocks crawlers from dashboard/API
- `manifest.ts` — PWA manifest

### ❌ Missing
- Per-page `<title>` and `<meta description>` (only contact detail has metadata export)
- OpenGraph tags
- PWA icons (`/icon.png`, `/icon-512.png`) — referenced but missing
- Branded favicon (current is default Next.js favicon.ico)

---

## Mobile Responsiveness

### ✅ Sidebar collapses on mobile
`hidden sm:flex` on sidebar — correct.

### ⚠️ Issues
- No hamburger menu for mobile navigation
- CRM table is not scrollable on mobile
- Pipeline Kanban board horizontal scrolling may be problematic on mobile
- No mobile-specific testing documented

---

## Frontend Score: 68 / 100

Deductions:
- -12: No pagination anywhere
- -8: Accessibility gaps
- -6: Missing PWA icons
- -4: No mobile nav menu
- -2: No streaming (UX issue)
