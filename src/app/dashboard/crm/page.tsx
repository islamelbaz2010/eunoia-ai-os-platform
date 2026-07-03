import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/dal";
import { hasRole, PIPELINE_STAGES } from "@/lib/types";
import { ContactRow } from "./contact-row";
import { QuickAddContact } from "./quick-add-contact";
import { CrmSearch } from "./crm-search";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "CRM — Eunoia AI OS" };

const STATUS_OPTIONS = [
  { value: "new",        label: "New" },
  { value: "contacted",  label: "Contacted" },
  { value: "qualified",  label: "Qualified" },
  { value: "won",        label: "Won" },
  { value: "lost",       label: "Lost" },
];

type View = "active" | "archived" | "deleted";

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    stage?: string;
    view?: View;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const membership = await getActiveOrganization();
  const supabase = await createClient();

  const view: View = sp.view === "archived" ? "archived" : sp.view === "deleted" ? "deleted" : "active";
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const limit = 50;

  type ContactRow = {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    status: string;
    pipeline_stage: string;
    owner_id: string | null;
    deleted_at: string | null;
    archived_at: string | null;
    created_at: string;
    total_count: number;
  };

  let contacts: ContactRow[] = [];
  let totalCount = 0;

  if (membership) {
    const { data } = await supabase.rpc("search_crm_contacts", {
      org_id:           membership.organization.id,
      q:                sp.q || null,
      p_status:         sp.status || null,
      p_stage:          sp.stage || null,
      p_tag_id:         null,
      p_owner_id:       null,
      include_archived: view === "archived",
      include_deleted:  view === "deleted",
      p_limit:          limit,
      p_offset:         (page - 1) * limit,
    });

    const rows = (data ?? []) as ContactRow[];

    if (view === "active") {
      contacts = rows.filter(r => !r.deleted_at && !r.archived_at);
    } else if (view === "archived") {
      contacts = rows.filter(r => !r.deleted_at && !!r.archived_at);
    } else {
      contacts = rows.filter(r => !!r.deleted_at);
    }

    totalCount = contacts[0]?.total_count ?? 0;
  }

  const canDelete  = !!membership && hasRole(membership.role, "admin");
  const canRestore = canDelete;
  const totalPages = Math.ceil(totalCount / limit);

  const buildUrl = (params: Record<string, string | undefined>) => {
    const merged = {
      q:      sp.q,
      status: sp.status,
      stage:  sp.stage,
      view:   view === "active" ? undefined : view,
      ...params,
    };
    const qs = Object.entries(merged)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join("&");
    return `/dashboard/crm${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">CRM</h1>
          <p className="mt-0.5 text-sm text-white/50">
            Manage contacts, leads, and pipeline for your property.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/crm/pipeline"
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/5 transition"
          >
            Pipeline
          </Link>
          <Link
            href="/dashboard/crm/activities"
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/5 transition"
          >
            Activities
          </Link>
          <Link
            href="/dashboard/crm/import"
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/5 transition"
          >
            Import
          </Link>
          {membership && (
            <a
              href={`/api/crm/export?org=${membership.organization.id}`}
              download
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/5 transition"
            >
              Export CSV
            </a>
          )}
        </div>
      </div>

      {/* Quick add */}
      <QuickAddContact />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CrmSearch
          defaultValue={sp.q ?? ""}
          currentStatus={sp.status}
          currentStage={sp.stage}
          currentView={view === "active" ? undefined : view}
        />

        <div className="flex flex-wrap gap-2">
          {/* View tabs */}
          {(["active", "archived", "deleted"] as View[]).map((v) => (
            <a
              key={v}
              href={buildUrl({ view: v === "active" ? undefined : v, page: "1" })}
              className={`rounded-lg px-3 py-1 text-xs transition capitalize ${
                view === v
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              {v}
            </a>
          ))}

          {/* Status filter */}
          <select
            value={sp.status ?? ""}
            onChange={() => {}}
            className="sr-only"
            aria-hidden
          />
          <a
            href={buildUrl({ status: undefined, page: "1" })}
            className={`rounded-lg px-3 py-1 text-xs transition ${
              !sp.status ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5"
            }`}
          >
            All statuses
          </a>
          {STATUS_OPTIONS.map((opt) => (
            <a
              key={opt.value}
              href={buildUrl({ status: opt.value, page: "1" })}
              className={`rounded-lg px-3 py-1 text-xs transition ${
                sp.status === opt.value
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              {opt.label}
            </a>
          ))}
        </div>
      </div>

      {/* Stage quick-filter */}
      <div className="flex flex-wrap gap-1.5">
        <a
          href={buildUrl({ stage: undefined, page: "1" })}
          className={`rounded-full px-3 py-0.5 text-xs transition ${
            !sp.stage ? "bg-accent/20 text-accent border border-accent/30" : "text-white/40 hover:text-white border border-border"
          }`}
        >
          All stages
        </a>
        {PIPELINE_STAGES.map((s) => (
          <a
            key={s.value}
            href={buildUrl({ stage: s.value, page: "1" })}
            className={`rounded-full px-3 py-0.5 text-xs transition ${
              sp.stage === s.value
                ? "bg-white/10 text-white border border-white/20"
                : "text-white/40 hover:text-white border border-border"
            }`}
          >
            {s.label}
          </a>
        ))}
      </div>

      {/* Contact table */}
      <div className="glass-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="text-xs text-white/40">
            {totalCount > 0 ? `${totalCount} contact${totalCount !== 1 ? "s" : ""}` : "No contacts"}
          </span>
          {membership && view === "active" && (
            <a
              href={`/api/crm/export?org=${membership.organization.id}`}
              className="text-xs text-white/40 hover:text-white transition"
            >
              Export CSV
            </a>
          )}
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border/60 text-white/40 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium hidden sm:table-cell">Email</th>
              <th className="px-5 py-3 font-medium hidden md:table-cell">Company</th>
              <th className="px-5 py-3 font-medium">Stage</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {contacts.map((contact) => (
              <ContactRow
                key={contact.id}
                contact={contact}
                canDelete={canDelete}
                canRestore={canRestore}
                isDeleted={!!contact.deleted_at}
                isArchived={!!contact.archived_at}
              />
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-white/30">
                  {sp.q
                    ? `No contacts match "${sp.q}".`
                    : view === "deleted"
                    ? "No deleted contacts."
                    : view === "archived"
                    ? "No archived contacts."
                    : "No contacts yet. Add your first contact above."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <a
              href={buildUrl({ page: String(page - 1) })}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/5 transition"
            >
              Previous
            </a>
          )}
          <span className="text-xs text-white/40">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={buildUrl({ page: String(page + 1) })}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/5 transition"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  );
}
