# TOP 100 FIXES
**Eunoia AI OS — Ranked by Priority**  
**Date**: 2026-07-12

---

## P0 — MUST FIX BEFORE TUESDAY (Demo Killers)

| # | Issue | File/Location | Effort |
|---|-------|--------------|--------|
| 1 | RESEND_API_KEY not set in Vercel → demo request form fails | Vercel Dashboard | 5 min |
| 2 | FROM_EMAIL not set → emails sent from wrong address | Vercel Dashboard | 2 min |
| 3 | DEMO_REQUEST_EMAIL not set → demo leads go to default inbox | Vercel Dashboard | 2 min |
| 4 | Stripe price IDs missing → upgrade buttons disabled | Vercel Dashboard + Stripe | 10 min |
| 5 | STRIPE_SECRET_KEY not set → checkout session creation fails | Vercel Dashboard | 3 min |
| 6 | STRIPE_WEBHOOK_SECRET not set → webhook events rejected | Vercel Dashboard | 3 min |
| 7 | Migration 0009 not confirmed applied → dal.ts may crash for all users | Supabase SQL Editor | 10 min |
| 8 | Migration 0011 not confirmed applied → billing page crashes | Supabase SQL Editor | 10 min |
| 9 | Migration 0010 not confirmed applied → CRM RPCs may fail | Supabase SQL Editor | 5 min |
| 10 | Migration 0007 not applied → usage page RPC fails | Supabase SQL Editor | 5 min |

---

## P1 — HIGH PRIORITY (Fix This Week)

| # | Issue | File/Location | Effort |
|---|-------|--------------|--------|
| 11 | No mobile navigation in dashboard | `src/app/dashboard/layout.tsx` | 2 hrs |
| 12 | Chat history not persisted → resets on refresh | New: `chat_messages` table + `chat.tsx` | 2 days |
| 13 | Sentry DSN not configured → no error tracking | Vercel Dashboard | 5 min |
| 14 | METRICS_TOKEN not set → Prometheus endpoint open to internet | Vercel Dashboard | 2 min |
| 15 | SENTRY_AUTH_TOKEN not in GitHub Actions → source maps broken | GitHub Settings → Secrets | 5 min |
| 16 | KB document limit 100 silently truncated | `src/app/dashboard/knowledge-base/page.tsx:21` | 1 hr |
| 17 | Dashboard usage chart fetches 2000 rows in JS → N+1 risk | `src/app/dashboard/page.tsx:64-87` | 2 hrs |
| 18 | Dashboard status chart fetches 5000 rows in JS | `src/app/dashboard/page.tsx:91-108` | 2 hrs |
| 19 | FAQ claims "9 role levels" — actual roles are 4 (owner/admin/member/viewer) | `src/app/_landing/faq.tsx:35` | 15 min |
| 20 | Pricing page: CSV import shown as Pro-only but Starter plan includes it | `src/app/_landing/pricing.tsx` vs `src/lib/stripe/plans.ts` | 30 min |
| 21 | No document edit capability — documents can't be corrected after upload | `knowledge-base/actions.ts` | 6 hrs |
| 22 | No KB document quota enforcement at creation (only visible in billing UI) | `knowledge-base/actions.ts` | 2 hrs |
| 23 | ROI stats ("3hrs saved", "< 2hrs to go live") are claims with no evidence source | `src/app/_landing/roi.tsx` | Legal review |
| 24 | Email domain `eunoiaos.com` may not be verified in Resend → emails rejected | Resend DNS settings | 30 min |
| 25 | `duplicate 0009 migration files` — 4 files for the same migration number | `supabase/migrations/` | 1 hr cleanup |
| 26 | `duplicate 0010 migration files` — 2 files for migration 0010 | `supabase/migrations/` | 30 min cleanup |
| 27 | No contact edit from CRM list view → must navigate to detail page to edit | `crm/contact-row.tsx` | 3 hrs |
| 28 | No "back to landing page" from dashboard | `dashboard/layout.tsx` | 30 min |
| 29 | No user profile edit page — can't change name from dashboard | New page needed | 2 hrs |
| 30 | No password change from within dashboard (password reset is email-only) | New feature needed | 3 hrs |

---

## P2 — MEDIUM PRIORITY (Fix This Month)

| # | Issue | File/Location | Effort |
|---|-------|--------------|--------|
| 31 | No email verification on signup — anyone can register with any email | Supabase auth settings | 30 min |
| 32 | No rate limit on login endpoint → brute-force attack possible | `proxy.ts` | 2 hrs |
| 33 | No rate limit on signup endpoint → account enumeration possible | `proxy.ts` | 1 hr |
| 34 | `script-src 'unsafe-inline'` in CSP → reduces XSS protection | `next.config.ts` | 4 hrs |
| 35 | `connect-src` CSP missing Sentry tunnel domain → Sentry events blocked | `next.config.ts` | 30 min |
| 36 | PWA icons missing (`public/icon.png`, `public/icon-512.png`) | `public/` | 1 hr |
| 37 | Default Next.js favicon not replaced with branded version | `src/app/favicon.ico` | 30 min |
| 38 | Unused scaffold SVGs in public/ (file.svg, globe.svg, next.svg, vercel.svg, window.svg) | `public/` | 5 min |
| 39 | No PostHog analytics → no funnel data, no user behavior insights | New: PostHog integration | 4 hrs |
| 40 | No social proof on landing page (zero testimonials, zero customer logos) | `src/app/_landing/` | Content only |
| 41 | No comparison page vs HubSpot/Notion/Chatbase | New landing section | 4 hrs |
| 42 | Trial signup doesn't send welcome email with setup guide | New: email template | 2 hrs |
| 43 | Invite link is single-use — no resend functionality | `settings/actions.ts` | 2 hrs |
| 44 | No pagination on audit logs page | `audit-logs/page.tsx` | 2 hrs |
| 45 | No pagination on usage page | `usage/page.tsx` | 2 hrs |
| 46 | No search/filter on audit logs | `audit-logs/page.tsx` | 3 hrs |
| 47 | CRM export has no plan-based access control (available to all tiers in UI) | `crm/page.tsx` | 1 hr |
| 48 | CRM `quick-add-contact.tsx` does not check contact quota before showing form | `crm/quick-add-contact.tsx` | 1 hr |
| 49 | No OpenGraph image → social shares show generic preview | New: `opengraph-image.tsx` | 1 hr |
| 50 | No Twitter/X card image → social shares show generic preview | New: Twitter card | 1 hr |
| 51 | Sitemap hardcodes domain — should use NEXT_PUBLIC_APP_URL | `src/app/sitemap.ts` | 30 min |
| 52 | Google Search Console not configured → SEO performance unknown | External | 30 min |
| 53 | No robots.txt file | New: `public/robots.txt` | 15 min |
| 54 | No canonical URLs configured | `layout.tsx` metadata | 1 hr |
| 55 | Annual billing shown in pricing but Stripe annual price IDs not set | `stripe/plans.ts` | 10 min |
| 56 | No trial end reminder emails | New: Stripe webhook + Resend | 4 hrs |
| 57 | No payment failed email to user | New: Stripe webhook + Resend | 2 hrs |
| 58 | ManageBillingButton not shown when no Stripe subscription — users on free plan see nothing | `billing/page.tsx` | 2 hrs |
| 59 | Admin panel has no search or filter | `admin/page.tsx` | 2 hrs |
| 60 | Admin panel has no user count or MRR display | `admin/page.tsx` | 3 hrs |

---

## P3 — LOW PRIORITY (Polish — Fix Next Quarter)

| # | Issue | File/Location | Effort |
|---|-------|--------------|--------|
| 61 | No dark/light mode toggle — dark mode only | Global CSS | 4 hrs |
| 62 | No keyboard shortcut for submitting AI question (Ctrl+Enter) | `chat.tsx` | 30 min |
| 63 | AI assistant has no conversation title/session naming | `chat.tsx` | 2 hrs |
| 64 | No "copy answer" button on AI responses | `chat.tsx` | 30 min |
| 65 | No "thumbs up / thumbs down" feedback on AI answers | `chat.tsx` | 2 hrs |
| 66 | No loading skeleton on CRM table | `crm/loading.tsx` | 1 hr |
| 67 | Pipeline board column counts not clickable to filter | `pipeline-board.tsx` | 1 hr |
| 68 | No bulk actions on CRM list (select all, bulk delete) | `crm/page.tsx` | 4 hrs |
| 69 | No inline status change on CRM list row | `contact-row.tsx` | 2 hrs |
| 70 | Contact detail page AI insights section requires plan check | `crm/[id]/contact-ai-insights.tsx` | 2 hrs |
| 71 | No "last seen" / "last contacted" field on contacts | DB migration needed | 1 day |
| 72 | No contact merge functionality | Complex feature | 2 days |
| 73 | Knowledge Base has no document preview | `knowledge-base/page.tsx` | 4 hrs |
| 74 | No file upload support — text/paste only | `knowledge-base/document-form.tsx` | 1 day |
| 75 | No document version history | DB + UI | 2 days |
| 76 | No "Ask AI about this document" from KB page | `knowledge-base/page.tsx` | 2 hrs |
| 77 | No markdown rendering in AI responses | `chat.tsx` | 2 hrs |
| 78 | No typing indicator animation on assistant page | `chat.tsx` | 1 hr |
| 79 | Team settings page has no profile photo upload | `settings/page.tsx` | 4 hrs |
| 80 | No 2FA / MFA option | Supabase Auth + UI | 1 day |
| 81 | No SSO/SAML (listed as Enterprise feature but not built) | Complex | 2 weeks |
| 82 | No webhook system for external integrations | Complex | 2 weeks |
| 83 | No Zapier/Make integration | Complex | 1 week |
| 84 | No WhatsApp integration (mentioned in FAQ as use case) | Complex | 2 weeks |
| 85 | Usage page chart is too simple — no breakdown by user or feature | `usage/page.tsx` | 4 hrs |
| 86 | No CSV download option for usage data | `usage/page.tsx` | 2 hrs |
| 87 | `hello@eunoiaos.com` in FAQ — ensure this inbox is monitored | Operations | Immediate |
| 88 | Grafana dashboard JSON exists but not deployed anywhere | `docs/operations/grafana/` | 2 hrs |
| 89 | No Uptime monitoring configured | External service | 30 min |
| 90 | No status page for incident communication | External service | 1 hr |
| 91 | Footer has no LinkedIn/Twitter links | `src/app/_landing/footer.tsx` | 30 min |
| 92 | Footer has no address/company info | `src/app/_landing/footer.tsx` | 15 min |
| 93 | No cookie consent banner (GDPR compliance) | New component | 4 hrs |
| 94 | No data export for users (GDPR right to access) | New API route | 4 hrs |
| 95 | Terms page says "Eunoia AI OS" but no legal entity name | `terms/page.tsx` | Legal review |
| 96 | Privacy page has generic placeholders | `privacy/page.tsx` | Legal review |
| 97 | No 404 page custom design | `not-found.tsx` | 1 hr |
| 98 | Dashboard header shows only role badge — no avatar | `dashboard/layout.tsx` | 1 hr |
| 99 | No notification system (in-app alerts for trial ending, etc.) | Complex | 3 days |
| 100 | No multi-language support in the dashboard UI | Complex | 2 weeks |
