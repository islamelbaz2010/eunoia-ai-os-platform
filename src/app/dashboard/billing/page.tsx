import { CreditCard, Zap, Users, BookOpen, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/dal";
import { hasRole } from "@/lib/types";
import {
  PLANS,
  getEffectivePlan,
  formatPrice,
  type BillingSubscription,
} from "@/lib/stripe/plans";
import { isStripeConfigured } from "@/lib/stripe/client";
import { UpgradeButton, ManageBillingButton } from "./upgrade-button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Billing — Eunoia AI OS" };

function StatusBadge({ status, trialDaysLeft }: { status: string; trialDaysLeft: number }) {
  if (status === "trialing" && trialDaysLeft > 0) {
    const daysLeft = trialDaysLeft;
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
        <AlertCircle className="h-3 w-3" />
        Trial — {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Active
      </span>
    );
  }
  if (status === "past_due") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
        <XCircle className="h-3 w-3" />
        Payment Failed
      </span>
    );
  }
  if (status === "canceled") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/50">
        <XCircle className="h-3 w-3" />
        Canceled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/50">
      {status}
    </span>
  );
}

function UsageBar({ current, max, label }: { current: number; max: number | null; label: string }) {
  if (max === null) {
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-white/50">{label}</span>
          <span className="text-white/70">{current.toLocaleString()} / ∞</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/5">
          <div className="h-full w-1/4 rounded-full bg-accent/50" />
        </div>
      </div>
    );
  }
  const pct = Math.min(100, (current / max) * 100);
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-accent";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-white/50">{label}</span>
        <span className={pct >= 90 ? "text-red-400" : "text-white/70"}>
          {current.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/5">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function BillingPage() {
  const membership = await getActiveOrganization();
  const stripeEnabled = isStripeConfigured();

  if (!membership) {
    return <div className="py-12 text-center text-white/40">No active organization.</div>;
  }

  const isOwner = hasRole(membership.role, "owner");
  const supabase = await createClient();
  const orgId = membership.organization.id;

  // Fetch billing subscription
  const { data: billingRaw } = await supabase
    .from("billing_subscriptions")
    .select("*")
    .eq("organization_id", orgId)
    .single();

  const billing = billingRaw as BillingSubscription | null;
  const effectivePlan = getEffectivePlan(billing);

  // Fetch usage metrics in parallel
  const [
    { count: memberCount },
    { count: contactCount },
    { count: docCount },
  ] = await Promise.all([
    supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("crm_contacts").select("id", { count: "exact", head: true }).eq("organization_id", orgId).is("deleted_at", null).is("archived_at", null),
    supabase.from("knowledge_base_documents").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
  ]);

  const hasStripeSubscription = !!(billing?.stripe_subscription_id);
  const isCanceling = !!(billing?.cancel_at && !billing.canceled_at);
  const trialDaysLeft = billing?.trial_ends_at
    ? Math.ceil((new Date(billing.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-white/60">
          Manage your subscription, usage, and billing details.
        </p>
      </div>

      {/* Current plan */}
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <CreditCard className="h-5 w-5 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{effectivePlan.name} Plan</p>
                {billing && (
                  <StatusBadge status={billing.status} trialDaysLeft={trialDaysLeft} />
                )}
              </div>
              <p className="mt-0.5 text-sm text-white/50">{effectivePlan.description}</p>
            </div>
          </div>

          {isOwner && (
            <div className="flex gap-2">
              {hasStripeSubscription ? (
                <ManageBillingButton />
              ) : null}
            </div>
          )}
        </div>

        {/* Billing period */}
        {billing?.current_period_end && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/5 px-4 py-3 text-sm">
            <span className="text-white/50">
              {isCanceling ? "Access ends" : "Renews"}
            </span>
            <span className="font-medium">
              {new Date(billing.current_period_end).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {billing.billing_interval && (
              <span className="ml-auto text-white/40 capitalize">
                {billing.billing_interval}
              </span>
            )}
          </div>
        )}

        {/* Trial expiry warning */}
        {billing?.status === "trialing" && trialDaysLeft <= 7 && trialDaysLeft > 0 && !hasStripeSubscription && (
          <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300">
            <strong>Your trial ends in {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}.</strong>{" "}
            Upgrade to keep your team&apos;s access and data.
          </div>
        )}

        {/* Past due warning */}
        {billing?.status === "past_due" && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
            <strong>Payment failed.</strong> Please update your payment method to restore full access.
            {isOwner && <span> Use &ldquo;Manage Billing&rdquo; above to update your card.</span>}
          </div>
        )}
      </div>

      {/* Usage */}
      <div className="glass-panel p-6">
        <h2 className="mb-4 text-sm font-medium text-white/70">Current Usage</h2>
        <div className="space-y-4">
          <UsageBar
            current={memberCount ?? 0}
            max={effectivePlan.limits.members}
            label="Team members"
          />
          <UsageBar
            current={contactCount ?? 0}
            max={effectivePlan.limits.contacts}
            label="CRM contacts"
          />
          <UsageBar
            current={docCount ?? 0}
            max={effectivePlan.limits.kbDocuments}
            label="Knowledge Base documents"
          />
          <div className="pt-1">
            <p className="text-xs text-white/40">
              AI queries:{" "}
              {effectivePlan.limits.aiQueriesPerHour === null
                ? "Unlimited"
                : `Up to ${effectivePlan.limits.aiQueriesPerHour}/hour`}
            </p>
          </div>
        </div>
      </div>

      {/* Plan comparison */}
      {isOwner && !stripeEnabled && (
        <div className="glass-panel p-6">
          <p className="text-sm text-white/40">
            Stripe billing is not configured on this instance. Contact your administrator to enable paid subscriptions.
          </p>
        </div>
      )}

      {isOwner && stripeEnabled && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-white/70">Available Plans</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(["starter", "pro"] as const).map((pid) => {
              const plan = PLANS[pid];
              const isCurrentPlan = effectivePlan.id === pid;
              const highlight = pid === "pro";
              const priceId = plan.monthlyPriceId;
              const notConfigured = !priceId;

              return (
                <div
                  key={pid}
                  className={`glass-panel relative p-5 ${
                    highlight ? "border-accent/30" : ""
                  } ${isCurrentPlan ? "ring-1 ring-accent/40" : ""}`}
                >
                  {plan.badge && (
                    <span className="absolute -top-2.5 left-4 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                      {plan.badge}
                    </span>
                  )}
                  {isCurrentPlan && (
                    <span className="absolute -top-2.5 right-4 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-medium text-white/60">
                      Current
                    </span>
                  )}

                  <div className="mb-4">
                    <p className="font-semibold">{plan.name}</p>
                    <p className="mt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-bold">
                        {formatPrice(plan.monthlyPrice)}
                      </span>
                      <span className="text-xs text-white/40">/month</span>
                    </p>
                    {plan.annualPrice && (
                      <p className="mt-0.5 text-xs text-white/40">
                        or {formatPrice(plan.annualPrice)}/yr (2 months free)
                      </p>
                    )}
                  </div>

                  <ul className="mb-5 space-y-2 text-xs text-white/60">
                    <li className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 shrink-0 text-white/30" />
                      {plan.limits.members === null ? "Unlimited" : `Up to ${plan.limits.members}`} members
                    </li>
                    <li className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 shrink-0 text-white/30" />
                      {plan.limits.kbDocuments === null ? "Unlimited" : plan.limits.kbDocuments} KB documents
                    </li>
                    <li className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 shrink-0 text-white/30" />
                      {plan.limits.aiQueriesPerHour === null ? "Unlimited" : `${plan.limits.aiQueriesPerHour}/hr`} AI queries
                    </li>
                  </ul>

                  {isCurrentPlan ? (
                    hasStripeSubscription ? (
                      <ManageBillingButton />
                    ) : (
                      <p className="rounded-lg bg-white/5 py-2 text-center text-xs text-white/40">
                        Your current plan
                      </p>
                    )
                  ) : (
                    <UpgradeButton
                      planId={pid}
                      interval="monthly"
                      label={`Upgrade to ${plan.name}`}
                      highlight={highlight}
                      disabled={notConfigured}
                      disabledReason={notConfigured ? "This plan is not yet available." : undefined}
                    />
                  )}
                </div>
              );
            })}

            {/* Enterprise card */}
            <div className="glass-panel p-5">
              <div className="mb-4">
                <p className="font-semibold">Enterprise</p>
                <p className="mt-1 text-2xl font-bold">Custom</p>
                <p className="mt-0.5 text-xs text-white/40">Contact us for pricing</p>
              </div>
              <ul className="mb-5 space-y-2 text-xs text-white/60">
                <li className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 shrink-0 text-white/30" />
                  Unlimited members
                </li>
                <li className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-white/30" />
                  Unlimited documents
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 shrink-0 text-white/30" />
                  Unlimited AI queries + SSO
                </li>
              </ul>
              <a
                href="mailto:hello@eunoia.ai?subject=Enterprise%20Inquiry"
                className="block w-full rounded-lg border border-border py-2 text-center text-sm text-white/70 transition hover:bg-white/5"
              >
                Contact Sales
              </a>
            </div>
          </div>

          {/* Annual billing note */}
          <p className="text-center text-xs text-white/30">
            Annual billing saves 2 months. All plans include a 14-day free trial.
          </p>
        </div>
      )}

      {/* Non-owners see a read-only view */}
      {!isOwner && (
        <div className="glass-panel p-6">
          <p className="text-sm text-white/50">
            Contact your workspace owner to upgrade or manage billing.
          </p>
        </div>
      )}
    </div>
  );
}
