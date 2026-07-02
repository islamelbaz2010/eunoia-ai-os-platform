import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, verifySession } from "@/lib/auth/dal";
import { hasRole, type CrmActivity, type CrmActivityType } from "@/lib/types";
import { ActivitiesClient } from "./activities-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Activities — Eunoia AI OS" };

const ACTIVITY_LABELS: Record<CrmActivityType, string> = {
  task:      "Task",
  follow_up: "Follow-up",
  call:      "Call",
  meeting:   "Meeting",
  email:     "Email",
};

export default async function ActivitiesPage() {
  await verifySession();
  const membership = await getActiveOrganization();
  if (!membership) {
    return <div className="py-12 text-center text-white/40">No active organization.</div>;
  }

  const supabase = await createClient();

  const [{ data: activitiesData }, { data: membersData }] = await Promise.all([
    supabase
      .from("crm_activities")
      .select(`
        *,
        crm_contacts(id, full_name, company)
      `)
      .eq("organization_id", membership.organization.id)
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("organization_members")
      .select("id, user_id, profiles(id, full_name)")
      .eq("organization_id", membership.organization.id),
  ]);

  type ActivityWithContact = CrmActivity & {
    crm_contacts: { id: string; full_name: string; company: string | null } | null;
  };

  const activities = (activitiesData ?? []) as unknown as ActivityWithContact[];
  type RawMember = { id: string; user_id: string; profiles: { id: string; full_name: string | null }[] | { id: string; full_name: string | null } | null };
  const members = ((membersData ?? []) as unknown as RawMember[]).map(m => ({
    ...m,
    profiles: Array.isArray(m.profiles) ? (m.profiles[0] ?? null) : m.profiles,
  }));
  const canEdit = hasRole(membership.role, "member");

  const pending = activities.filter(a => !a.completed_at);
  const completed = activities.filter(a => !!a.completed_at).slice(0, 20);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activities</h1>
          <p className="mt-0.5 text-sm text-white/50">
            {pending.length} pending · {completed.length} recently completed
          </p>
        </div>
        <Link href="/dashboard/crm" className="text-xs text-white/40 hover:text-white transition border border-border rounded-lg px-3 py-1.5">
          ← CRM
        </Link>
      </div>

      <ActivitiesClient
        pending={pending as ActivityWithContact[]}
        completed={completed as ActivityWithContact[]}
        members={members}
        orgId={membership.organization.id}
        canEdit={canEdit}
        activityLabels={ACTIVITY_LABELS}
      />
    </div>
  );
}
