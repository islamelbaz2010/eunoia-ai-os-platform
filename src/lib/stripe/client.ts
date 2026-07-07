import "server-only";

import Stripe from "stripe";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Singleton Stripe client — constructed once per cold start.
let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
    stripeClient = new Stripe(key, {
      apiVersion: "2026-06-24.dahlia",
      typescript: true,
    });
  }
  return stripeClient;
}

// Anon Supabase client for the Stripe webhook handler.
// The webhook has no user session (no cookies), so we cannot use the
// cookie-based createClient(). Instead we use the anon key + SECURITY DEFINER
// SQL functions (granted to the anon role) to process billing events safely.
// This client cannot read/write RLS-protected tables — only call granted RPCs.
export function createAnonSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars.");
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET
  );
}
