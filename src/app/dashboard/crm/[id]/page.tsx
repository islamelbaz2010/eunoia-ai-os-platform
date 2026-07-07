import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, verifySession } from "@/lib/auth/dal";
import { hasRole, PIPELINE_STAGES, type CrmContact, type CrmTimelineEvent, type CrmActivity, type CrmTag } from "@/lib/types";
import { EditContactModal } from "./edit-contact-modal";
import { ContactTimeline } from "./contact-timeline";
import { ContactActivities } from "./contact-activities";
import { ContactTags } from "./contact-tags";
import { ContactAiInsights } from "./contact-ai-insights";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact — Eunoia AI OS" };

const stageColor: Record<string, string> = {
  lead:        "bg-indigo-500/10 text-indigo-300 border-indigo-400/20",
  qualified:   "bg-cyan-500/10 text-cyan-300 border-cyan-400/20",
  proposal:    "bg-amber-500/10 text-amber-300 border-amber-400/20",
  negotiation: "bg-orange-500/10 text-orange-300 border-orange-400/20",
  won:         "bg-emerald-500/10 text-emerald-300 border-emerald-400/20",
  lost:        "bg-red-500/10 text-red-300 border-red-400/20",
};

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await verifySession();
  const { id } = await params;
  const membership = await getActiveOrganization();
  if (!membership) notFound();

  const supabase = await createClient();

  // Fetch contact
  const { data: contact } = await supabase
    .from("crm_contacts")
    .select("*")
    .eq("id", id)
    .eq("organization_id", membership.organization.id)
    .single();

  if (!contact) notFound();

  const c = contact as unknown as CrmContact;

  // Parallel data fetch
  const [{ data: timelineData }, { data: activitiesData }, { data: tagsData }, { data: allTagsData }, { data: membersData }] =
    await Promise.all([
      supabase
        .from("crm_timeline_events")
        .select("*")
        .eq("contact_id", id)
        .eq("organization_id", membership.organization.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("crm_activities")
        .select("*")
        .eq("contact_id", id)
        .eq("organization_id", membership.organization.id)
        .order("due_at", { ascending: true }),
      supabase
        .from("crm_contact_tags")
        .select("tag_id, crm_tags(id, name, color)")
        .eq("contact_id", id),
      supabase
        .from("crm_tags")
        .select("id, name, color")
        .eq("organization_id", membership.organization.id)
        .order("name"),
      supabase
        .from("organization_members")
        .select("id, user_id, role, profiles(id, full_name)")
        .eq("organization_id", membership.organization.id),
    ]);

  const timeline   = (timelineData ?? []) as unknown as CrmTimelineEvent[];
  const activities = (activitiesData ?? []) as unknown as CrmActivity[];
  const contactTags = (tagsData ?? []).map((r: { crm_tags: unknown }) => r.crm_tags as CrmTag).filter(Boolean);
  const allTags     = (allTagsData ?? []) as CrmTag[];
  const canEdit     = hasRole(membership.role, "member");
  const canAdmin    = hasRole(membership.role, "admin");

  const stageLabel = PIPELINE_STAGES.find(s => s.value === c.pipeline_stage)?.label ?? c.pipeline_stage;

  type RawMember = { id: string; user_id: string; role: string; profiles: { id: string; full_name: string | null }[] | { id: string; full_name: string | null } | null };
  const members = ((membersData ?? []) as unknown as RawMember[]).map(m => ({
    ...m,
    profiles: Array.isArray(m.profiles) ? (m.profiles[0] ?? null) : m.profiles,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Breadcrumb */}
      <nav className="text-xs text-white/40">
        <Link href="/dashboard/crm" className="hover:text-white transition">CRM</Link>
        <span className="mx-1.5">/</span>
        <span className="text-white/70">{c.full_name}</span>
      </nav>

      {/* Contact header */}
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/20 text-lg font-semibold text-accent">
              {c.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold">{c.full_name}</h1>
                {c.deleted_at && (
                  <span className="rounded text-xs px-1.5 py-0.5 bg-red-500/10 text-red-400">deleted</span>
                )}
                {c.archived_at && !c.deleted_at && (
                  <span className="rounded text-xs px-1.5 py-0.5 bg-white/10 text-white/40">archived</span>
                )}
              </div>
              {c.company && <p className="text-sm text-white/50 mt-0.5">{c.company}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${stageColor[c.pipeline_stage] ?? "bg-white/10 text-white/60 border-border"}`}>
                  {stageLabel}
                </span>
                <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-white/50 capitalize">
                  {c.status}
                </span>
                {c.source && c.source !== "manual" && (
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-white/40 capitalize">
                    {c.source}
                  </span>
                )}
              </div>
            </div>
          </div>

          {canEdit && !c.deleted_at && (
            <EditContactModal contact={c} members={members} />
          )}
        </div>

        {/* Contact details grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-3">
          {c.email && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/30">Email</p>
              <a href={`mailto:${c.email}`} className="mt-0.5 text-sm text-accent hover:underline break-all">
                {c.email}
              </a>
            </div>
          )}
          {c.phone && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/30">Phone</p>
              <a href={`tel:${c.phone}`} className="mt-0.5 text-sm hover:text-accent transition">
                {c.phone}
              </a>
            </div>
          )}
          {c.website && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/30">Website</p>
              <a href={c.website} target="_blank" rel="noopener noreferrer"
                className="mt-0.5 text-sm text-accent hover:underline break-all">
                {c.website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}
          {c.linkedin_url && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/30">LinkedIn</p>
              <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer"
                className="mt-0.5 text-sm text-accent hover:underline break-all">
                {c.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\/?/, "").slice(0, 40)}
              </a>
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/30">Added</p>
            <p className="mt-0.5 text-sm text-white/60">
              {new Date(c.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </p>
          </div>
        </div>

        {c.notes && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Notes</p>
            <p className="text-sm text-white/60 whitespace-pre-line">{c.notes}</p>
          </div>
        )}
      </div>

      {/* Tags */}
      <ContactTags
        contactId={c.id}
        contactTags={contactTags}
        allTags={allTags}
        orgId={membership.organization.id}
        canEdit={canEdit}
        canAdmin={canAdmin}
      />

      {/* AI Insights */}
      {(c.ai_summary || c.ai_next_action || c.ai_lead_score !== null) && (
        <ContactAiInsights contact={c} />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Activities */}
        <ContactActivities
          contactId={c.id}
          activities={activities}
          members={members}
          orgId={membership.organization.id}
          canEdit={canEdit && !c.deleted_at}
        />

        {/* Timeline */}
        <ContactTimeline
          contactId={c.id}
          events={timeline}
          orgId={membership.organization.id}
          canEdit={canEdit && !c.deleted_at}
          canAdmin={canAdmin}
          currentUserId={session.userId}
        />
      </div>
    </div>
  );
}
