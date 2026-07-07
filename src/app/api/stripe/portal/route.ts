import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, verifySession } from "@/lib/auth/dal";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe/client";
import { hasRole } from "@/lib/types";
import { logger } from "@/lib/logger";

export async function POST(): Promise<NextResponse> {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Billing is not configured on this instance." },
      { status: 503 }
    );
  }

  await verifySession();
  const membership = await getActiveOrganization();

  if (!membership) {
    return NextResponse.json({ error: "No active organization." }, { status: 403 });
  }

  if (!hasRole(membership.role, "owner")) {
    return NextResponse.json(
      { error: "Only workspace owners can manage billing." },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const { data: billing } = await supabase
    .from("billing_subscriptions")
    .select("stripe_customer_id")
    .eq("organization_id", membership.organization.id)
    .single();

  if (!billing?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No Stripe customer found. Please subscribe first." },
      { status: 404 }
    );
  }

  const stripe = getStripeClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      return_url: `${appUrl}/dashboard/billing`,
    });

    logger.info("[stripe/portal] Session created", {
      orgId: membership.organization.id,
      customerId: billing.stripe_customer_id,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    logger.error("[stripe/portal] Error", { error: String(err) });
    return NextResponse.json(
      { error: "Failed to open billing portal. Please try again." },
      { status: 500 }
    );
  }
}
