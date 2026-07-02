import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, verifySession } from "@/lib/auth/dal";
import { hasRole, PIPELINE_STAGES } from "@/lib/types";
import { PipelineBoard } from "./pipeline-board";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pipeline — Eunoia AI OS" };

export default async function PipelinePage() {
  await verifySession();
  const membership = await getActiveOrganization();

  if (!membership) {
    return (
      <div className="py-12 text-center text-white/40">
        No active organization.
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("crm_contacts")
    .select("id, full_name, email, company, pipeline_stage, status, owner_id, updated_at")
    .eq("organization_id", membership.organization.id)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  type PipelineContact = {
    id: string;
    full_name: string;
    email: string | null;
    company: string | null;
    pipeline_stage: string;
    status: string;
    owner_id: string | null;
    updated_at: string;
  };

  const contacts = (data ?? []) as PipelineContact[];

  const columns = PIPELINE_STAGES.map(stage => ({
    ...stage,
    contacts: contacts.filter(c => c.pipeline_stage === stage.value),
  }));

  const canEdit = hasRole(membership.role, "member");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="mt-0.5 text-sm text-white/50">Drag contacts between stages to update their pipeline position.</p>
        </div>
        <Link href="/dashboard/crm" className="text-xs text-white/40 hover:text-white transition border border-border rounded-lg px-3 py-1.5">
          ← All contacts
        </Link>
      </div>
      <PipelineBoard columns={columns} canEdit={canEdit} />
    </div>
  );
}
