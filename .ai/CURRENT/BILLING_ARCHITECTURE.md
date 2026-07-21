# Billing Architecture

Eunoia AI OS uses a Stripe-based subscription billing system designed for multi-tenant SaaS. This document describes every layer.

---

## Subscription Tiers

| Plan       | Monthly | Annual   | Members | Contacts | KB Docs | AI Queries/hr |
|------------|---------|----------|---------|----------|---------|---------------|
| Free       | —       | —        | 3       | 25       | 10      | 10            |
| Starter    | $99     | $990     | 5       | 500      | 50      | 50            |
| Pro        | $299    | $2,990   | 25      | Unlimited| 500     | Unlimited     |
| Enterprise | Custom  | Custom   | ∞       | ∞        | ∞       | ∞             |

All plans include a 14-day free trial with no credit card required.

---

## Database Schema (`supabase/migrations/0011_billing.sql`)

### `billing_subscriptions`
One row per organization. Created automatically by DB trigger on org creation.

| Column                | Type        | Notes                                    |
|-----------------------|-------------|------------------------------------------|
| `organization_id`     | uuid PK/FK  | One-to-one with organizations            |
| `stripe_customer_id`  | text        | Created on first checkout attempt        |
| `stripe_subscription_id` | text     | Set by webhook on checkout completion    |
| `plan_id`             | text        | `free\|starter\|pro\|enterprise`          |
| `status`              | text        | Mirrors Stripe: `trialing\|active\|past_due\|canceled` |
| `billing_interval`    | text        | `monthly\|annual\|null`                  |
| `trial_ends_at`       | timestamptz | Default: now() + 14 days                |
| `current_period_start`| timestamptz | From Stripe SubscriptionItem (SDK v22+)  |
| `current_period_end`  | timestamptz | From Stripe SubscriptionItem (SDK v22+)  |
| `cancel_at`           | timestamptz | Set if scheduled to cancel               |
| `canceled_at`         | timestamptz | Set when actually canceled               |

### `billing_events`
Idempotency log for Stripe webhook events.

| Column           | Type        | Notes                                   |
|------------------|-------------|-----------------------------------------|
| `stripe_event_id`| text UNIQUE | Stripe event ID, unique constraint       |
| `event_type`     | text        | e.g. `customer.subscription.updated`   |
| `processed_at`   | timestamptz | Server timestamp at processing time      |

### RLS Policies
- `billing_subscriptions`: members can SELECT their org's row; owners can UPDATE.
- `billing_events`: INSERT-only via SECURITY DEFINER RPC (no direct access).

---

## State Machine

```
[org created] → trialing (14 days)
    ↓ checkout.session.completed
active ←→ past_due (invoice.payment_failed)
    ↓ cancel_at_period_end / customer.subscription.deleted
canceled
```

`getEffectivePlan(billing)` resolves this state machine to a `PlanLimits` object:
- `trialing` → starter limits (trial gives full access)
- `active` → plan limits
- `past_due` → free limits (graceful degradation)
- `canceled` → free limits
- `null` (no row) → free limits

---

## Key Files

| File | Role |
|------|------|
| `supabase/migrations/0011_billing.sql` | Schema, RLS, trigger, SECURITY DEFINER RPC |
| `src/lib/stripe/client.ts` | Stripe singleton, anon Supabase client for webhooks |
| `src/lib/stripe/plans.ts` | Plan definitions, price IDs, `getEffectivePlan()` |
| `src/lib/stripe/quota.ts` | Per-org limit checks for contacts/docs/members/AI |
| `src/lib/env.ts` | Stripe env vars (secret key, webhook secret, price IDs) |
| `src/app/api/stripe/checkout/route.ts` | Creates Stripe Checkout Session |
| `src/app/api/stripe/portal/route.ts` | Creates Stripe Customer Portal Session |
| `src/app/api/stripe/webhook/route.ts` | Validates + processes Stripe events |
| `src/app/dashboard/billing/page.tsx` | Billing dashboard (RSC) |
| `src/app/dashboard/billing/upgrade-button.tsx` | UpgradeButton + ManageBillingButton (client) |

---

## Checkout Flow

```
User clicks "Upgrade" → UpgradeButton client component
→ POST /api/stripe/checkout { planId, interval }
    → verifySession() + getActiveOrganization()
    → requireRole("owner")
    → upsert Stripe Customer (stripe.customers.create or retrieve)
    → persist stripe_customer_id → billing_subscriptions
    → stripe.checkout.sessions.create({
        customer, price_id, trial_period_days: 14,
        mode: "subscription", success_url, cancel_url
      })
→ returns { url }
→ window.location.href = url  (redirect to Stripe hosted checkout)
→ User completes payment on Stripe
→ Stripe fires checkout.session.completed webhook
→ POST /api/stripe/webhook (raw body, signature verified)
→ process_stripe_event() SECURITY DEFINER RPC
    → idempotency check (billing_events)
    → UPDATE billing_subscriptions
    → UPDATE organizations.subscription_tier
```

---

## Webhook Idempotency

Every incoming Stripe webhook is processed via the `process_stripe_event()` PostgreSQL SECURITY DEFINER function:

1. Checks `billing_events` for `stripe_event_id` (unique constraint).
2. If already processed → returns `{already_processed: true}`, no-op.
3. If new → inserts into `billing_events`, syncs `billing_subscriptions`, updates `organizations.subscription_tier`, all in one atomic transaction.

The webhook route handler returns HTTP 200 even on application errors to prevent Stripe from retrying. Errors are logged via `logger.error`.

---

## Security Model

| Concern | Mitigation |
|---------|-----------|
| Webhook spoofing | `stripe.webhooks.constructEvent()` with raw body + `STRIPE_WEBHOOK_SECRET` |
| Service role key | Never used in cloud env. Webhook uses anon key + SECURITY DEFINER RPC |
| Organization isolation | Every billing query uses `organization_id` from verified session membership |
| Plan escalation | `getEffectivePlan()` reads from DB, never from client-supplied values |
| Stripe key in client | Only `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is exposed; all API calls are server-side |

---

## Quota Enforcement

All quota checks happen in `src/lib/stripe/quota.ts`. Each check:
1. Fetches `billing_subscriptions` for the org.
2. Calls `getEffectivePlan(billing)` to resolve current limits.
3. Counts current usage from the relevant table.
4. Returns `null` (allowed) or a human-readable error string (blocked).

Quota checks are called at the start of:
- `createContact()` → `checkContactLimit()`
- `createDocument()` → `checkDocumentLimit()`
- `createInvite()` → `checkMemberLimit()`
- `askAssistant()` + stream route → `getAiQueryRateLimit()` (per-hour, per-user)

If the quota service is unreachable (DB down), we default to allowing the operation (`.catch(() => null)`) to avoid blocking users for infrastructure issues.

---

## Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Server-side API calls (checkout, portal, customer) |
| `STRIPE_WEBHOOK_SECRET` | Verify webhook signatures |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side (future Stripe.js, not currently used) |
| `STRIPE_STARTER_MONTHLY_PRICE_ID` | Stripe Price ID for Starter plan monthly |
| `STRIPE_STARTER_ANNUAL_PRICE_ID` | Stripe Price ID for Starter plan annual |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Stripe Price ID for Pro plan monthly |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | Stripe Price ID for Pro plan annual |

Add these to Vercel → Project → Settings → Environment Variables.

---

## Customer Portal

Self-service subscription management via Stripe-hosted portal:
- Upgrade / downgrade plan
- Update payment method
- View invoice history
- Cancel subscription

Access: `ManageBillingButton` → POST `/api/stripe/portal` → `stripe.billingPortal.sessions.create()` → redirect.

Only available once the org has a Stripe subscription (`stripe_customer_id` present).

---

## Webhook Events Handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Sync subscription from Stripe, update org tier |
| `customer.subscription.created` | Full sync via `process_stripe_event` |
| `customer.subscription.updated` | Full sync (handles plan changes, cancel scheduling) |
| `customer.subscription.deleted` | Mark canceled, downgrade org to free |
| `invoice.payment_succeeded` | Reset `past_due` → `active` |
| `invoice.payment_failed` | Mark `past_due`, degraded feature access |
| `customer.subscription.trial_will_end` | Logged (future: trigger upgrade reminder email) |

---

## Stripe SDK Version

Stripe SDK: `v22.3.0`, API version: `2026-06-24.dahlia`.

**Breaking change vs older SDKs**: `current_period_start` and `current_period_end` moved from `Subscription` to `SubscriptionItem` (`subscription.items.data[0].current_period_start`). The webhook handler reads from `firstItem.current_period_*` accordingly.
