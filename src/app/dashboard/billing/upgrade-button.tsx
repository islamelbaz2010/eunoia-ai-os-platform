"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { PlanId, BillingInterval } from "@/lib/stripe/plans";

interface UpgradeButtonProps {
  planId: PlanId;
  interval: BillingInterval;
  label: string;
  highlight?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

export function UpgradeButton({
  planId,
  interval,
  label,
  highlight,
  disabled,
  disabledReason,
}: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (disabled || loading) return;
    setLoading(true);
    try {
      const resp = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, interval }),
      });

      const data = (await resp.json()) as { url?: string; error?: string };

      if (!resp.ok || !data.url) {
        toast.error(data.error ?? "Failed to start checkout. Please try again.");
        return;
      }

      window.location.href = data.url;
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      title={disabledReason}
      className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
        highlight
          ? "bg-accent text-white hover:opacity-90"
          : "border border-border text-white/70 hover:bg-white/5"
      }`}
    >
      {loading ? "Redirecting…" : label}
    </button>
  );
}

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      const resp = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await resp.json()) as { url?: string; error?: string };
      if (!resp.ok || !data.url) {
        toast.error(data.error ?? "Failed to open billing portal.");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="rounded-lg border border-border px-4 py-2 text-sm text-white/70 transition hover:bg-white/5 disabled:opacity-50"
    >
      {loading ? "Opening…" : "Manage Billing"}
    </button>
  );
}
