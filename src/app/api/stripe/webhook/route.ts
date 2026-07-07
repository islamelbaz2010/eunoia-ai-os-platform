import "server-only";

import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient, createAnonSupabaseClient } from "@/lib/stripe/client";
import { getPlanIdFromPriceId, getBillingIntervalFromPriceId } from "@/lib/stripe/plans";
import { logger } from "@/lib/logger";

// Raw body is required for Stripe signature verification.
// Next.js App Router does NOT parse the body before the handler, so req.text() works.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    logger.warn("[stripe/webhook] Signature verification failed", { error: String(err) });
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  logger.info("[stripe/webhook] Received event", { type: event.type, id: event.id });

  const supabase = createAnonSupabaseClient();

  try {
    const result = await routeEvent(event, supabase);
    logger.info("[stripe/webhook] Event processed", { type: event.type, id: event.id, result });
    return NextResponse.json({ received: true, result });
  } catch (err) {
    logger.error("[stripe/webhook] Processing error", { type: event.type, id: event.id, error: String(err) });
    // Return 200 to prevent Stripe from retrying — we logged the error for manual investigation.
    // Stripe retries on 5xx; retrying a broken event can cause duplicate charges.
    return NextResponse.json({ received: true, error: "Processing error — logged for review." });
  }
}

type AnonClient = ReturnType<typeof createAnonSupabaseClient>;

async function routeEvent(event: Stripe.Event, supabase: AnonClient): Promise<unknown> {
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabase);

    case "customer.subscription.created":
    case "customer.subscription.updated":
      return syncSubscription(event.id, event.type, event.data.object as Stripe.Subscription, supabase);

    case "customer.subscription.deleted":
      return syncSubscription(event.id, event.type, event.data.object as Stripe.Subscription, supabase, true);

    case "invoice.payment_succeeded":
      return handleInvoicePaymentSucceeded(event.id, event.data.object as Stripe.Invoice, supabase);

    case "invoice.payment_failed":
      return handleInvoicePaymentFailed(event.id, event.data.object as Stripe.Invoice, supabase);

    case "customer.subscription.trial_will_end":
      // 3 days before trial ends: log it — email reminders handled externally (Resend)
      return logEventOnly(event.id, event.type, supabase);

    default:
      return logEventOnly(event.id, event.type, supabase);
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: AnonClient
): Promise<unknown> {
  // On checkout.session.completed the subscription may not be fully active yet.
  // We rely on customer.subscription.updated to sync the definitive subscription state.
  // Here we just ensure the stripe_customer_id is persisted on the billing record.
  if (!session.customer || !session.subscription) return { skipped: "no_customer_or_subscription" };

  const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
  const orgId = session.metadata?.organization_id;

  if (orgId) {
    // Set stripe_customer_id via the anon-accessible RPC
    const { error } = await supabase.rpc("process_stripe_event", {
      p_stripe_event_id:      session.id + "_checkout",
      p_event_type:           "checkout.session.completed",
      p_customer_id:          customerId,
      p_subscription_id:      null,
      p_plan_id:              session.metadata?.plan_id ?? null,
      p_status:               null,
      p_trial_ends_at:        null,
      p_current_period_start: null,
      p_current_period_end:   null,
      p_cancel_at:            null,
      p_canceled_at:          null,
      p_billing_interval:     session.metadata?.billing_interval ?? null,
    });
    if (error) logger.warn("[stripe/webhook] checkout.completed RPC error", { error: String(error) });
  }

  return { customerId, orgId };
}

async function syncSubscription(
  eventId: string,
  eventType: string,
  sub: Stripe.Subscription,
  supabase: AnonClient,
  deleted = false
): Promise<unknown> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const priceItem = sub.items.data[0];
  const priceId   = priceItem?.price.id ?? null;
  const planId    = getPlanIdFromPriceId(priceId);
  const interval  = getBillingIntervalFromPriceId(priceId);

  const status = deleted ? "canceled" : sub.status;

  const trialEnd = sub.trial_end
    ? new Date(sub.trial_end * 1000).toISOString()
    : null;

  // In Stripe API 2026-06-24.dahlia, period dates moved from Subscription to SubscriptionItem.
  const firstItem = sub.items?.data?.[0];
  const periodStart = firstItem?.current_period_start
    ? new Date(firstItem.current_period_start * 1000).toISOString()
    : null;

  const periodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000).toISOString()
    : null;

  const cancelAt = sub.cancel_at
    ? new Date(sub.cancel_at * 1000).toISOString()
    : null;

  const canceledAt = sub.canceled_at
    ? new Date(sub.canceled_at * 1000).toISOString()
    : null;

  const { data, error } = await supabase.rpc("process_stripe_event", {
    p_stripe_event_id:      eventId,
    p_event_type:           eventType,
    p_customer_id:          customerId,
    p_subscription_id:      sub.id,
    p_plan_id:              planId,
    p_status:               status,
    p_trial_ends_at:        trialEnd,
    p_current_period_start: periodStart,
    p_current_period_end:   periodEnd,
    p_cancel_at:            cancelAt,
    p_canceled_at:          canceledAt,
    p_billing_interval:     interval,
  });

  if (error) {
    logger.error("[stripe/webhook] syncSubscription RPC error", { error: String(error), eventId, customerId });
    throw new Error(`RPC error: ${error.message}`);
  }

  return data;
}

async function handleInvoicePaymentSucceeded(
  eventId: string,
  invoice: Stripe.Invoice,
  supabase: AnonClient
): Promise<unknown> {
  // Payment succeeded: ensure org tier is set to active plan.
  // The subscription.updated event handles the definitive sync, but this
  // provides an extra signal for the billing event log.
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;

  const { data, error } = await supabase.rpc("process_stripe_event", {
    p_stripe_event_id:      eventId,
    p_event_type:           "invoice.payment_succeeded",
    p_customer_id:          customerId,
    p_subscription_id:      null,
    p_plan_id:              null,
    p_status:               "active",
    p_trial_ends_at:        null,
    p_current_period_start: null,
    p_current_period_end:   null,
    p_cancel_at:            null,
    p_canceled_at:          null,
    p_billing_interval:     null,
  });

  if (error) logger.warn("[stripe/webhook] invoice.payment_succeeded RPC error", { error: String(error) });
  return data;
}

async function handleInvoicePaymentFailed(
  eventId: string,
  invoice: Stripe.Invoice,
  supabase: AnonClient
): Promise<unknown> {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;

  const { data, error } = await supabase.rpc("process_stripe_event", {
    p_stripe_event_id:      eventId,
    p_event_type:           "invoice.payment_failed",
    p_customer_id:          customerId,
    p_subscription_id:      null,
    p_plan_id:              null,
    p_status:               "past_due",
    p_trial_ends_at:        null,
    p_current_period_start: null,
    p_current_period_end:   null,
    p_cancel_at:            null,
    p_canceled_at:          null,
    p_billing_interval:     null,
  });

  if (error) logger.warn("[stripe/webhook] invoice.payment_failed RPC error", { error: String(error) });
  return data;
}

async function logEventOnly(eventId: string, eventType: string, supabase: AnonClient): Promise<unknown> {
  const { data } = await supabase.rpc("process_stripe_event", {
    p_stripe_event_id:      eventId,
    p_event_type:           eventType,
    p_customer_id:          null,
    p_subscription_id:      null,
    p_plan_id:              null,
    p_status:               null,
    p_trial_ends_at:        null,
    p_current_period_start: null,
    p_current_period_end:   null,
    p_cancel_at:            null,
    p_canceled_at:          null,
    p_billing_interval:     null,
  });
  return data;
}
