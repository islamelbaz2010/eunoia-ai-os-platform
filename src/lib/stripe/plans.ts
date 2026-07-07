// Authoritative plan definitions — single source of truth for feature limits,
// pricing, and Stripe price IDs. All quota checks reference this file.
// To add a new plan: add entry here + add migration to seed billing_subscriptions.

export type PlanId = "free" | "starter" | "pro" | "enterprise";
export type BillingInterval = "monthly" | "annual";

export interface PlanLimits {
  members: number | null;       // null = unlimited
  contacts: number | null;
  kbDocuments: number | null;
  aiQueriesPerHour: number | null;
  csvExport: boolean;
  csvImport: boolean;
  aiInsights: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
  sso: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  monthlyPriceId: string | null;
  annualPriceId: string | null;
  monthlyPrice: number | null;   // in USD cents
  annualPrice: number | null;    // in USD cents (total for year)
  trialDays: number;
  limits: PlanLimits;
  description: string;
  badge?: string;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    monthlyPriceId: null,
    annualPriceId: null,
    monthlyPrice: null,
    annualPrice: null,
    trialDays: 0,
    description: "Essential features for individuals.",
    limits: {
      members:          3,
      contacts:         25,
      kbDocuments:      10,
      aiQueriesPerHour: 10,
      csvExport:        false,
      csvImport:        false,
      aiInsights:       false,
      customBranding:   false,
      prioritySupport:  false,
      sso:              false,
    },
  },

  starter: {
    id: "starter",
    name: "Starter",
    monthlyPriceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ?? null,
    annualPriceId:  process.env.STRIPE_STARTER_ANNUAL_PRICE_ID  ?? null,
    monthlyPrice:   9900,    // $99.00
    annualPrice:    99000,   // $990.00 (2 months free)
    trialDays:      14,
    description: "For a single property team.",
    limits: {
      members:          5,
      contacts:         500,
      kbDocuments:      50,
      aiQueriesPerHour: 50,
      csvExport:        true,
      csvImport:        true,
      aiInsights:       false,
      customBranding:   false,
      prioritySupport:  false,
      sso:              false,
    },
  },

  pro: {
    id: "pro",
    name: "Pro",
    monthlyPriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? null,
    annualPriceId:  process.env.STRIPE_PRO_ANNUAL_PRICE_ID  ?? null,
    monthlyPrice:   29900,   // $299.00
    annualPrice:    299000,  // $2,990.00 (2 months free)
    trialDays:      14,
    description: "For growing teams.",
    badge: "Most Popular",
    limits: {
      members:          25,
      contacts:         null,   // unlimited
      kbDocuments:      500,
      aiQueriesPerHour: null,   // unlimited
      csvExport:        true,
      csvImport:        true,
      aiInsights:       true,
      customBranding:   true,
      prioritySupport:  true,
      sso:              false,
    },
  },

  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    monthlyPriceId: null,
    annualPriceId:  null,
    monthlyPrice:   null,
    annualPrice:    null,
    trialDays:      0,
    description: "For hotel groups and multi-property operators.",
    limits: {
      members:          null,
      contacts:         null,
      kbDocuments:      null,
      aiQueriesPerHour: null,
      csvExport:        true,
      csvImport:        true,
      aiInsights:       true,
      customBranding:   true,
      prioritySupport:  true,
      sso:              true,
    },
  },
};

// Map a Stripe price ID back to our plan ID.
export function getPlanIdFromPriceId(priceId: string | null | undefined): PlanId {
  if (!priceId) return "free";
  for (const plan of Object.values(PLANS)) {
    if (plan.monthlyPriceId === priceId || plan.annualPriceId === priceId) {
      return plan.id;
    }
  }
  return "free";
}

export function getBillingIntervalFromPriceId(priceId: string | null | undefined): BillingInterval | null {
  if (!priceId) return null;
  for (const plan of Object.values(PLANS)) {
    if (plan.monthlyPriceId === priceId) return "monthly";
    if (plan.annualPriceId === priceId) return "annual";
  }
  return null;
}

export type BillingSubscription = {
  id: string;
  organization_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan_id: PlanId;
  billing_interval: BillingInterval | null;
  status: string;
  trial_ends_at: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
};

export function getEffectivePlan(billing: BillingSubscription | null): Plan {
  if (!billing) return PLANS.free;

  const now = Date.now();

  if (billing.status === "trialing") {
    const trialEnd = new Date(billing.trial_ends_at).getTime();
    if (now < trialEnd) {
      // Trial active: give them the plan they're trialing
      return PLANS[billing.plan_id] ?? PLANS.starter;
    }
    // Trial expired without payment: free tier
    return PLANS.free;
  }

  if (billing.status === "active") {
    return PLANS[billing.plan_id] ?? PLANS.free;
  }

  if (billing.status === "past_due") {
    // Grace period: keep current plan briefly (Stripe handles retries)
    return PLANS[billing.plan_id] ?? PLANS.free;
  }

  // canceled, paused, incomplete, etc.
  return PLANS.free;
}

export function formatPrice(cents: number | null, interval?: BillingInterval): string {
  if (cents === null) return "Custom";
  const dollars = cents / 100;
  const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(dollars);
  if (!interval) return formatted;
  return interval === "annual" ? `${formatted}/yr` : `${formatted}/mo`;
}

export function getPlanDisplayLimit(value: number | null, unit: string): string {
  if (value === null) return `Unlimited ${unit}`;
  return `${value.toLocaleString()} ${unit}`;
}
