"use client";

import { useState, useTransition } from "react";
import type { CrmContact } from "@/lib/types";

function ScoreBar({ label, value, color }: { label: string; value: number | null; color: string }) {
  if (value === null) return null;
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-white/50">
        <span>{label}</span>
        <span>{pct}/100</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function ContactAiInsights({ contact }: { contact: CrmContact }) {
  const [refreshing, startRefresh] = useTransition();
  const [localInsights, setLocalInsights] = useState<{
    summary?: string;
    nextAction?: string;
    leadScore?: number | null;
    riskScore?: number | null;
    opportunityScore?: number | null;
    suggestedEmail?: string | null;
    suggestedWhatsapp?: string | null;
  }>({
    summary: contact.ai_summary ?? undefined,
    nextAction: contact.ai_next_action ?? undefined,
    leadScore: contact.ai_lead_score,
    riskScore: contact.ai_risk_score,
    opportunityScore: contact.ai_opportunity_score,
    suggestedEmail: contact.ai_suggested_email,
    suggestedWhatsapp: contact.ai_suggested_whatsapp,
  });
  const [error, setError] = useState<string | null>(null);

  function refreshInsights() {
    setError(null);
    startRefresh(async () => {
      try {
        const res = await fetch(`/api/crm/insights?contactId=${contact.id}`, { method: "POST" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          setError(body.error ?? "Failed to generate insights.");
          return;
        }
        const data = await res.json() as typeof localInsights;
        setLocalInsights(data);
      } catch {
        setError("Failed to connect to AI service.");
      }
    });
  }

  const hasInsights = localInsights.summary || localInsights.leadScore !== null || localInsights.leadScore !== undefined;
  if (!hasInsights) return null;

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">✦</span>
          <h2 className="text-sm font-semibold">AI Insights</h2>
          {contact.ai_updated_at && (
            <span className="text-[10px] text-white/30">
              Updated {new Date(contact.ai_updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
        <button
          onClick={refreshInsights}
          disabled={refreshing}
          className="text-xs text-accent hover:underline disabled:opacity-50"
        >
          {refreshing ? "Generating…" : "Refresh"}
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {localInsights.summary && (
        <div className="rounded-lg bg-white/3 p-3">
          <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Summary</p>
          <p className="text-xs text-white/70 leading-relaxed">{localInsights.summary}</p>
        </div>
      )}

      {localInsights.nextAction && (
        <div className="rounded-lg bg-accent/5 border border-accent/20 p-3">
          <p className="text-[10px] uppercase tracking-wider text-accent/60 mb-1">Suggested Next Action</p>
          <p className="text-xs text-white/80">{localInsights.nextAction}</p>
        </div>
      )}

      <div className="space-y-2.5">
        <ScoreBar label="Lead Score"        value={localInsights.leadScore ?? null}        color="#6366f1" />
        <ScoreBar label="Opportunity Score" value={localInsights.opportunityScore ?? null} color="#10b981" />
        <ScoreBar label="Risk Score"        value={localInsights.riskScore ?? null}        color="#ef4444" />
      </div>

      {(localInsights.suggestedEmail || localInsights.suggestedWhatsapp) && (
        <div className="space-y-2">
          {localInsights.suggestedEmail && (
            <details className="rounded-lg border border-border/60">
              <summary className="cursor-pointer px-3 py-2 text-xs text-white/60 hover:text-white">
                Suggested Email
              </summary>
              <div className="border-t border-border/40 px-3 py-2">
                <p className="text-xs text-white/60 whitespace-pre-line">{localInsights.suggestedEmail}</p>
              </div>
            </details>
          )}
          {localInsights.suggestedWhatsapp && (
            <details className="rounded-lg border border-border/60">
              <summary className="cursor-pointer px-3 py-2 text-xs text-white/60 hover:text-white">
                Suggested WhatsApp Message
              </summary>
              <div className="border-t border-border/40 px-3 py-2">
                <p className="text-xs text-white/60 whitespace-pre-line">{localInsights.suggestedWhatsapp}</p>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
