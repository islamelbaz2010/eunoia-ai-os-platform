import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifySession, getActiveMemberships } from "@/lib/auth/dal";
import { logAuditEvent, logUsageEvent } from "@/lib/auth/audit";
import { getOpenAIClient, CHAT_MODEL } from "@/lib/ai/openai";
import { logger } from "@/lib/logger";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INSIGHTS_RATE_LIMIT_PER_HOUR = 10;

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await verifySession();
    const memberships = await getActiveMemberships();

    const contactId = req.nextUrl.searchParams.get("contactId");
    if (!contactId || !UUID_RE.test(contactId)) {
      return NextResponse.json({ error: "Invalid contactId." }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch contact + verify org membership
    const { data: contact } = await supabase
      .from("crm_contacts")
      .select("*, organization_id")
      .eq("id", contactId)
      .single();

    if (!contact) return NextResponse.json({ error: "Contact not found." }, { status: 404 });

    const orgId = (contact as { organization_id: string }).organization_id;
    const isMember = memberships.some(m => m.organization.id === orgId);
    if (!isMember) return NextResponse.json({ error: "Access denied." }, { status: 403 });

    // Rate limit: 10 AI insight calls per user per org per hour
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("actor_id", session.userId)
      .eq("event_type", "ai_insights")
      .gte("created_at", since);

    if ((recentCount ?? 0) >= INSIGHTS_RATE_LIMIT_PER_HOUR) {
      return NextResponse.json(
        { error: `Rate limit reached. You can generate up to ${INSIGHTS_RATE_LIMIT_PER_HOUR} AI insights per hour.` },
        { status: 429 }
      );
    }

    const { data: timeline } = await supabase
      .from("crm_timeline_events")
      .select("event_type, title, body, created_at")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: activities } = await supabase
      .from("crm_activities")
      .select("type, title, completed_at, due_at")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Build context for AI — user-controlled fields are sliced to limit prompt injection surface
    const c = contact as Record<string, unknown>;
    const timelineText = (timeline ?? [])
      .map((e: Record<string, unknown>) => `[${e["event_type"]}] ${String(e["title"]).slice(0, 100)}${e["body"] ? `: ${String(e["body"]).slice(0, 200)}` : ""}`)
      .join("\n");

    const activitiesText = (activities ?? [])
      .map((a: Record<string, unknown>) => `[${a["type"]}] ${String(a["title"]).slice(0, 100)} - ${a["completed_at"] ? "completed" : a["due_at"] ? `due ${new Date(String(a["due_at"])).toLocaleDateString()}` : "no due date"}`)
      .join("\n");

    const prompt = `You are a CRM AI assistant. Analyze this contact and provide insights.

Contact:
- Name: ${String(c["full_name"]).slice(0, 100)}
- Email: ${c["email"] ?? "unknown"}
- Phone: ${c["phone"] ?? "unknown"}
- Company: ${String(c["company"] ?? "unknown").slice(0, 100)}
- Pipeline Stage: ${c["pipeline_stage"]}
- Status: ${c["status"]}
- Notes: ${String(c["notes"] ?? "").slice(0, 500)}
- Source: ${c["source"]}

Recent Timeline Events:
${timelineText || "No events recorded"}

Recent Activities:
${activitiesText || "No activities recorded"}

Respond with a JSON object containing exactly these fields:
{
  "summary": "2-3 sentence summary of this contact's relationship and current situation",
  "nextAction": "The single most important action to take with this contact right now (1 sentence)",
  "leadScore": integer 0-100 (likelihood to convert based on engagement and stage),
  "riskScore": integer 0-100 (risk of losing this contact or them going cold),
  "opportunityScore": integer 0-100 (estimated revenue/value opportunity),
  "suggestedEmail": "A professional email to send to this contact right now (3-4 sentences)",
  "suggestedWhatsapp": "A brief WhatsApp message to send to this contact (1-2 sentences)"
}

Only respond with the JSON, no other text.`;

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let insights: Record<string, unknown>;
    try {
      insights = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "AI returned invalid response." }, { status: 500 });
    }

    // Persist insights scoped to org (defense-in-depth alongside RLS)
    await supabase
      .from("crm_contacts")
      .update({
        ai_summary:            insights["summary"] ?? null,
        ai_next_action:        insights["nextAction"] ?? null,
        ai_lead_score:         typeof insights["leadScore"] === "number" ? Math.round(insights["leadScore"] as number) : null,
        ai_risk_score:         typeof insights["riskScore"] === "number" ? Math.round(insights["riskScore"] as number) : null,
        ai_opportunity_score:  typeof insights["opportunityScore"] === "number" ? Math.round(insights["opportunityScore"] as number) : null,
        ai_suggested_email:    insights["suggestedEmail"] ?? null,
        ai_suggested_whatsapp: insights["suggestedWhatsapp"] ?? null,
        ai_updated_at:         new Date().toISOString(),
      })
      .eq("id", contactId)
      .eq("organization_id", orgId);

    logger.info("[crm/insights] Generated AI insights", { contactId, actorId: session.userId });

    void logUsageEvent({ organizationId: orgId, actorId: session.userId, eventType: "ai_insights" });
    void logAuditEvent({ organizationId: orgId, actorId: session.userId, action: "ai_insights.generated", targetType: "contact", targetId: contactId });

    return NextResponse.json({
      summary:           insights["summary"],
      nextAction:        insights["nextAction"],
      leadScore:         insights["leadScore"],
      riskScore:         insights["riskScore"],
      opportunityScore:  insights["opportunityScore"],
      suggestedEmail:    insights["suggestedEmail"],
      suggestedWhatsapp: insights["suggestedWhatsapp"],
    });
  } catch (e) {
    logger.error("[crm/insights] Error", { error: String(e) });
    return NextResponse.json({ error: "AI service unavailable." }, { status: 500 });
  }
}
