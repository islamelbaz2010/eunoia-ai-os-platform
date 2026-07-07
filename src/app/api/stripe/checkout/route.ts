import "server-only";

import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, verifySession } from "@/lib/auth/dal";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe/client";
import { PLANS, type PlanId, type BillingInterval } from "@/lib/stripe/plans";
import { hasRole } from "@/lib/types";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  planId:   z.enum(["starter", "pro"]),
  interval: z.enum(["monthly", "annual"]).default("monthly"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Billing is not configured on this instance." },
      { status: 503 }
    );
  }

  const session = await verifySession();
  const membership = await getActiveOrganization();

  if (!membership) {
    return NextResponse.json({ error: "No active organization." }, { status: 403 });
  }

  // Only owners can initiate checkout
  if (!hasRole(membership.role, "owner")) {
    return NextResponse.json(
      { error: "Only workspace owners can manage billing." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  const { planId, interval } = parsed.data as { planId: PlanId; interval: BillingInterval };
  const plan = PLANS[planId];
  const priceId = interval === "annual" ? plan.annualPriceId : plan.monthlyPriceId;

  if (!priceId) {
    return NextResponse.json(
      { error: `The ${plan.name} ${interval} price is not configured yet.` },
      { status: 503 }
    );
  }

  const stripe = getStripeClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  const orgId = membership.organization.id;

  try {
    // Retrieve or create Stripe customer for this org
    const { data: billing } = await supabase
      .from("billing_subscriptions")
      .select("stripe_customer_id, status, plan_id")
      .eq("organization_id", orgId)
      .single();

    let customerId: string;

    if (billing?.stripe_customer_id) {
      customerId = billing.stripe_customer_id;
    } else {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: session.email ?? undefined,
        metadata: {
          organization_id: orgId,
          organization_name: membership.organization.name,
        },
      });
      customerId = customer.id;

      // Persist the customer ID immediately so webhooks can look it up
      await supabase
        .from("billing_subscriptions")
        .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq("organization_id", orgId);
    }

    // Create the Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: plan.trialDays > 0 ? plan.trialDays : undefined,
        metadata: {
          organization_id: orgId,
          plan_id: planId,
          billing_interval: interval,
        },
      },
      success_url: `${appUrl}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}&success=1`,
      cancel_url:  `${appUrl}/dashboard/billing?canceled=1`,
      metadata: {
        organization_id: orgId,
        plan_id: planId,
        billing_interval: interval,
      },
      allow_promotion_codes: true,
    });

    logger.info("[stripe/checkout] Session created", {
      sessionId: checkoutSession.id,
      orgId,
      planId,
      interval,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    logger.error("[stripe/checkout] Error creating session", { error: String(err), orgId });
    return NextResponse.json(
      { error: "Failed to create checkout session. Please try again." },
      { status: 500 }
    );
  }
}
