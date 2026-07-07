import "server-only";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  get SUPABASE_URL() {
    return requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  },
  get SUPABASE_ANON_KEY() {
    return requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get OPENAI_API_KEY() {
    return requireEnv("OPENAI_API_KEY");
  },

  // Stripe — optional at boot; required at billing feature entry points.
  // STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are validated on first use
  // (in getStripeClient() and the webhook handler respectively).
  get STRIPE_SECRET_KEY()       { return optionalEnv("STRIPE_SECRET_KEY"); },
  get STRIPE_WEBHOOK_SECRET()   { return optionalEnv("STRIPE_WEBHOOK_SECRET"); },
  get STRIPE_PUBLISHABLE_KEY()  { return optionalEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"); },

  // Stripe Price IDs (set in Vercel Dashboard after creating products in Stripe)
  get STRIPE_STARTER_MONTHLY()  { return optionalEnv("STRIPE_STARTER_MONTHLY_PRICE_ID"); },
  get STRIPE_STARTER_ANNUAL()   { return optionalEnv("STRIPE_STARTER_ANNUAL_PRICE_ID"); },
  get STRIPE_PRO_MONTHLY()      { return optionalEnv("STRIPE_PRO_MONTHLY_PRICE_ID"); },
  get STRIPE_PRO_ANNUAL()       { return optionalEnv("STRIPE_PRO_ANNUAL_PRICE_ID"); },
};
