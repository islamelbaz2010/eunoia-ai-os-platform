-- 0011 — Billing Infrastructure (Sprint 2)
-- Adds billing_subscriptions, billing_events, trial trigger,
-- plan sync RPC, and RLS policies.
--
-- Apply BEFORE deploying billing code to production.
-- Apply in Supabase SQL Editor (Dashboard → SQL Editor → New query).

-- =============================================================================
-- PART 1: billing_subscriptions
-- One row per organization. Created by trigger on org creation.
-- Stripe fields are null until the org subscribes.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid NOT NULL UNIQUE REFERENCES public.organizations (id) ON DELETE CASCADE,

  -- Stripe IDs (null until first checkout session completes)
  stripe_customer_id      text UNIQUE,
  stripe_subscription_id  text UNIQUE,
  stripe_price_id         text,

  -- Plan state
  plan_id                 text NOT NULL DEFAULT 'free',
  billing_interval        text CHECK (billing_interval IN ('monthly', 'annual')),

  -- Status mirrors Stripe subscription.status values + our 'trialing' before Stripe
  status                  text NOT NULL DEFAULT 'trialing',

  -- Trial tracking
  trial_ends_at           timestamptz NOT NULL DEFAULT (now() + interval '14 days'),

  -- Current period (populated from Stripe webhooks)
  current_period_start    timestamptz,
  current_period_end      timestamptz,

  -- Cancellation
  cancel_at               timestamptz,
  canceled_at             timestamptz,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_subscriptions_org_idx
  ON public.billing_subscriptions (organization_id);

CREATE INDEX IF NOT EXISTS billing_subscriptions_customer_idx
  ON public.billing_subscriptions (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- =============================================================================
-- PART 2: billing_events (idempotency log)
-- Stores every Stripe webhook event ID to prevent double-processing.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.billing_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type      text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}',
  processed_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_events_event_type_idx
  ON public.billing_events (event_type);

-- =============================================================================
-- PART 3: RLS
-- =============================================================================

ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events        ENABLE ROW LEVEL SECURITY;

-- Org members can view their subscription
CREATE POLICY "members can view billing subscription"
  ON public.billing_subscriptions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Owners can update billing (for setting stripe_customer_id during checkout)
CREATE POLICY "owners can update billing subscription"
  ON public.billing_subscriptions
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- billing_events: no direct user access (only via SECURITY DEFINER functions)
-- No policies needed — default deny for all user roles

-- =============================================================================
-- PART 4: Auto-create trial subscription on org creation
-- Every new organization gets a 14-day Starter trial automatically.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_default_billing_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.billing_subscriptions (
    organization_id,
    plan_id,
    status,
    trial_ends_at
  ) VALUES (
    NEW.id,
    'starter',
    'trialing',
    now() + interval '14 days'
  )
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_create_billing_subscription ON public.organizations;
CREATE TRIGGER organizations_create_billing_subscription
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE PROCEDURE public.create_default_billing_subscription();

-- =============================================================================
-- PART 5: process_stripe_event RPC
-- Called by the webhook handler (anon context). Handles idempotency,
-- subscription sync, and org tier update in one atomic operation.
-- SECURITY DEFINER runs as postgres (bypasses RLS).
-- GRANT to anon so the webhook handler (no user session) can call it.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.process_stripe_event(
  p_stripe_event_id       text,
  p_event_type            text,
  p_customer_id           text,
  p_subscription_id       text,
  p_plan_id               text,
  p_status                text,
  p_trial_ends_at         timestamptz,
  p_current_period_start  timestamptz,
  p_current_period_end    timestamptz,
  p_cancel_at             timestamptz,
  p_canceled_at           timestamptz,
  p_billing_interval      text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_new_tier text;
BEGIN
  -- Idempotency: reject duplicate events
  IF EXISTS (
    SELECT 1 FROM public.billing_events WHERE stripe_event_id = p_stripe_event_id
  ) THEN
    RETURN jsonb_build_object('status', 'already_processed');
  END IF;

  -- Events without a customer (e.g. test events): log and return
  IF p_customer_id IS NULL THEN
    INSERT INTO public.billing_events (stripe_event_id, event_type, payload)
    VALUES (p_stripe_event_id, p_event_type, '{}');
    RETURN jsonb_build_object('status', 'logged_no_customer');
  END IF;

  -- Look up the org for this Stripe customer
  SELECT organization_id INTO v_org_id
  FROM public.billing_subscriptions
  WHERE stripe_customer_id = p_customer_id;

  IF NOT FOUND THEN
    INSERT INTO public.billing_events (stripe_event_id, event_type, payload)
    VALUES (p_stripe_event_id, p_event_type,
      jsonb_build_object('customer', p_customer_id, 'note', 'customer not found'));
    RETURN jsonb_build_object('status', 'customer_not_found');
  END IF;

  -- Determine effective subscription tier
  v_new_tier := CASE
    WHEN p_status IN ('active', 'trialing') THEN COALESCE(p_plan_id, 'free')
    ELSE 'free'
  END;

  -- Update billing_subscriptions
  UPDATE public.billing_subscriptions
  SET
    stripe_subscription_id = COALESCE(p_subscription_id, stripe_subscription_id),
    stripe_price_id         = CASE WHEN p_subscription_id IS NOT NULL THEN p_plan_id ELSE stripe_price_id END,
    plan_id                 = COALESCE(p_plan_id, plan_id),
    status                  = COALESCE(p_status, status),
    trial_ends_at           = COALESCE(p_trial_ends_at, trial_ends_at),
    current_period_start    = COALESCE(p_current_period_start, current_period_start),
    current_period_end      = COALESCE(p_current_period_end, current_period_end),
    cancel_at               = p_cancel_at,
    canceled_at             = p_canceled_at,
    billing_interval        = COALESCE(p_billing_interval, billing_interval),
    updated_at              = now()
  WHERE stripe_customer_id = p_customer_id;

  -- Sync org's subscription_tier column
  UPDATE public.organizations
  SET subscription_tier = v_new_tier, updated_at = now()
  WHERE id = v_org_id;

  -- Log event for audit
  INSERT INTO public.billing_events (stripe_event_id, event_type, payload)
  VALUES (p_stripe_event_id, p_event_type, jsonb_build_object(
    'customer',           p_customer_id,
    'subscription',       p_subscription_id,
    'plan_id',            p_plan_id,
    'status',             p_status,
    'org_id',             v_org_id,
    'new_tier',           v_new_tier
  ));

  RETURN jsonb_build_object('status', 'processed', 'org_id', v_org_id, 'new_tier', v_new_tier);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_stripe_event TO anon;

-- =============================================================================
-- PART 6: Backfill existing organizations
-- Gives existing orgs a 1-year grace period so billing doesn't break anything.
-- New orgs get a 14-day trial via the trigger above.
-- =============================================================================

INSERT INTO public.billing_subscriptions (
  organization_id,
  plan_id,
  status,
  trial_ends_at
)
SELECT
  id,
  'starter',
  'trialing',
  now() + interval '1 year'   -- long grace period for existing orgs
FROM public.organizations
WHERE id NOT IN (
  SELECT organization_id FROM public.billing_subscriptions
)
ON CONFLICT (organization_id) DO NOTHING;

-- =============================================================================
-- PART 7: Updated-at trigger for billing_subscriptions
-- =============================================================================

DROP TRIGGER IF EXISTS billing_subscriptions_set_updated_at ON public.billing_subscriptions;
CREATE TRIGGER billing_subscriptions_set_updated_at
  BEFORE UPDATE ON public.billing_subscriptions
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();
