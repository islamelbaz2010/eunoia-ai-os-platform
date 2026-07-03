"use client";

import { useActionState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createActivity, completeActivity, deleteActivity } from "../actions";
import type { CrmActivity, CrmActivityType } from "@/lib/types";

type Member = { id: string; user_id: string; profiles: { id: string; full_name: string | null } | null };

const ACTIVITY_ICONS: Record<CrmActivityType, string> = {
  task:       "☑",
  follow_up:  "↩",
  call:       "📞",
  meeting:    "🤝",
  email:      "✉️",
};

const ACTIVITY_TYPES: { value: CrmActivityType; label: string }[] = [
  { value: "task",      label: "Task" },
  { value: "follow_up", label: "Follow-up" },
  { value: "call",      label: "Call" },
  { value: "meeting",   label: "Meeting" },
  { value: "email",     label: "Email" },
];

export function ContactActivities({
  contactId,
  activities,
  members,
  orgId: _orgId,
  canEdit,
}: {
  contactId: string;
  activities: CrmActivity[];
  members: Member[];
  orgId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isUpdating, transition] = useTransition();

  const boundCreate = useCallback(
    async (prev: { error?: string } | undefined, fd: FormData) => {
      fd.set("contactId", contactId);
      const result = await createActivity(prev, fd);
      if (!result?.error) {
        router.refresh();
        toast.success("Activity added.");
      }
      return result;
    },
    [contactId, router]
  );
  const [state, formAction, pending] = useActionState(boundCreate, undefined);

  const pending_ = activities.filter(a => !a.completed_at)
    .sort((a, b) => {
      if (!a.due_at && !b.due_at) return 0;
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    });
  const done_ = activities.filter(a => !!a.completed_at).slice(0, 5);

  const isOverdue = (a: CrmActivity) =>
    a.due_at && !a.completed_at && new Date(a.due_at) < new Date();

  return (
    <div className="glass-panel p-5 space-y-4">
      <h2 className="text-sm font-semibold">Activities</h2>

      {canEdit && (
        <form action={formAction} className="space-y-2 rounded-lg border border-border/60 p-3">
          <div className="flex gap-2">
            <select name="type" defaultValue="task" className="input-field text-xs">
              {ACTIVITY_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <input name="title" placeholder="Title *" required className="input-field w-full text-xs" />
          <input name="dueAt" type="datetime-local" className="input-field w-full text-xs" />
          <select name="ownerId" className="input-field w-full text-xs">
            <option value="">Assign to…</option>
            {members.map(m => (
              <option key={m.user_id} value={m.user_id}>
                {m.profiles?.full_name ?? m.user_id}
              </option>
            ))}
          </select>
          {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
          <button type="submit" disabled={pending}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50">
            {pending ? "Adding…" : "Add activity"}
          </button>
        </form>
      )}

      {pending_.length === 0 && done_.length === 0 && (
        <p className="text-xs text-white/30 text-center py-4">No activities yet.</p>
      )}

      <div className="space-y-1.5">
        {pending_.map(a => (
          <div key={a.id}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 group ${isOverdue(a) ? "bg-red-500/5 border border-red-400/20" : "bg-white/3 border border-border/40"}`}
          >
            <span className="text-sm">{ACTIVITY_ICONS[a.type as CrmActivityType]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{a.title}</p>
              {a.due_at && (
                <p className={`text-[10px] ${isOverdue(a) ? "text-red-400" : "text-white/40"}`}>
                  {isOverdue(a) ? "Overdue · " : ""}
                  {new Date(a.due_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
              <button
                disabled={isUpdating}
                onClick={() => transition(async () => {
                  await completeActivity(a.id, contactId);
                  router.refresh();
                  toast.success("Activity marked as done.");
                })}
                className="text-[10px] text-emerald-400/70 hover:text-emerald-400 disabled:opacity-40"
              >
                Done
              </button>
              <button
                disabled={isUpdating}
                onClick={() => transition(async () => {
                  await deleteActivity(a.id, contactId);
                  router.refresh();
                  toast.success("Activity deleted.");
                })}
                className="text-[10px] text-red-400/60 hover:text-red-400 disabled:opacity-40"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {done_.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Completed</p>
          {done_.map(a => (
            <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 opacity-50">
              <span className="text-sm">{ACTIVITY_ICONS[a.type as CrmActivityType]}</span>
              <p className="text-xs line-through text-white/40 truncate">{a.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
