"use client";

import { useTransition, useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { completeActivity, deleteActivity, createActivity } from "../actions";
import type { CrmActivity, CrmActivityType } from "@/lib/types";

type ActivityWithContact = CrmActivity & {
  crm_contacts: { id: string; full_name: string; company: string | null } | null;
};
type Member = { id: string; user_id: string; profiles: { id: string; full_name: string | null } | null };

const ACTIVITY_ICONS: Record<string, string> = {
  task: "☑", follow_up: "↩", call: "📞", meeting: "🤝", email: "✉️",
};

function formatDue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  if (diff < 0) return `Overdue · ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  if (diff < 86400000) return `Today · ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  if (diff < 172800000) return `Tomorrow · ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ActivitiesClient({
  pending,
  completed,
  members,
  orgId: _orgId,
  canEdit,
  activityLabels,
}: {
  pending: ActivityWithContact[];
  completed: ActivityWithContact[];
  members: Member[];
  orgId: string;
  canEdit: boolean;
  activityLabels: Record<CrmActivityType, string>;
}) {
  const router = useRouter();
  const [isUpdating, transition] = useTransition();
  const [formState, formAction, formPending] = useActionState(createActivity, undefined);

  return (
    <div className="space-y-5">
      {/* Quick add */}
      {canEdit && (
        <form action={formAction} className="glass-panel p-4 space-y-3">
          <p className="text-xs font-medium text-white/60">Add activity</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select name="type" defaultValue="task" className="input-field col-span-2 sm:col-span-1 text-xs">
              {Object.entries(activityLabels).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <input name="title" placeholder="Title *" required className="input-field col-span-2 sm:col-span-2 text-xs" />
            <input name="dueAt" type="datetime-local" className="input-field col-span-2 sm:col-span-1 text-xs" />
            <select name="ownerId" className="input-field col-span-2 text-xs">
              <option value="">Assign to…</option>
              {members.map(m => (
                <option key={m.user_id} value={m.user_id}>{m.profiles?.full_name ?? m.user_id}</option>
              ))}
            </select>
          </div>
          {formState?.error && <p className="text-xs text-red-400">{formState.error}</p>}
          <button type="submit" disabled={formPending}
            className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50">
            {formPending ? "Adding…" : "Add activity"}
          </button>
        </form>
      )}

      {/* Pending */}
      <div className="glass-panel overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <span className="text-xs font-medium text-white/60">Pending ({pending.length})</span>
        </div>
        {pending.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-white/30">No pending activities. Great job!</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {pending.map(a => {
              const overdue = a.due_at && new Date(a.due_at) < new Date();
              return (
                <li key={a.id} className={`flex items-center gap-3 px-5 py-3 group hover:bg-white/2 transition ${overdue ? "bg-red-500/3" : ""}`}>
                  <span className="text-sm shrink-0">{ACTIVITY_ICONS[a.type] ?? "•"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {a.due_at && (
                        <span className={`text-[10px] ${overdue ? "text-red-400" : "text-white/40"}`}>
                          {formatDue(a.due_at)}
                        </span>
                      )}
                      {a.crm_contacts && (
                        <Link href={`/dashboard/crm/${a.crm_contacts.id}`}
                          className="text-[10px] text-accent/60 hover:text-accent transition">
                          {a.crm_contacts.full_name}
                        </Link>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2 opacity-40 sm:opacity-0 group-hover:opacity-100 transition">
                      <button
                        disabled={isUpdating}
                        onClick={() => transition(async () => {
                          await completeActivity(a.id, a.contact_id ?? undefined);
                          router.refresh();
                          toast.success("Activity completed.");
                        })}
                        className="text-xs text-emerald-400 hover:underline disabled:opacity-40"
                      >
                        Complete
                      </button>
                      <button
                        disabled={isUpdating}
                        onClick={() => transition(async () => {
                          await deleteActivity(a.id, a.contact_id ?? undefined);
                          router.refresh();
                          toast.success("Activity deleted.");
                        })}
                        className="text-xs text-red-400/60 hover:text-red-400 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div className="glass-panel overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <span className="text-xs font-medium text-white/40">Recently Completed</span>
          </div>
          <ul className="divide-y divide-border/40">
            {completed.map(a => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3 opacity-50">
                <span className="text-sm shrink-0">{ACTIVITY_ICONS[a.type] ?? "•"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-through text-white/40">{a.title}</p>
                  {a.crm_contacts && (
                    <Link href={`/dashboard/crm/${a.crm_contacts.id}`}
                      className="text-[10px] text-accent/40 hover:text-accent transition">
                      {a.crm_contacts.full_name}
                    </Link>
                  )}
                </div>
                <span className="text-[10px] text-white/30 shrink-0">
                  {a.completed_at ? new Date(a.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
