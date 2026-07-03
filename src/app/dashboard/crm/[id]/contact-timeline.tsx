"use client";

import { useActionState, useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createTimelineEvent, deleteTimelineEvent } from "../actions";
import type { CrmTimelineEvent, CrmTimelineEventType } from "@/lib/types";

const EVENT_ICONS: Record<CrmTimelineEventType, string> = {
  note:     "📝",
  call:     "📞",
  meeting:  "🤝",
  email:    "✉️",
  whatsapp: "💬",
  system:   "⚙️",
};

const EVENT_TYPES: { value: CrmTimelineEventType; label: string }[] = [
  { value: "note",     label: "Note" },
  { value: "call",     label: "Call" },
  { value: "meeting",  label: "Meeting" },
  { value: "email",    label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ContactTimeline({
  contactId,
  events,
  orgId: _orgId,
  canEdit,
  canAdmin,
  currentUserId,
}: {
  contactId: string;
  events: CrmTimelineEvent[];
  orgId: string;
  canEdit: boolean;
  canAdmin: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [isDeleting, deleteTransition] = useTransition();

  const boundCreate = useCallback(
    async (prev: { error?: string } | undefined, fd: FormData) => {
      const result = await createTimelineEvent(contactId, prev, fd);
      if (!result?.error) {
        router.refresh();
        toast.success("Event logged.");
      }
      return result;
    },
    [contactId, router]
  );
  const [state, formAction, pending] = useActionState(boundCreate, undefined);

  function handleDelete(eventId: string) {
    deleteTransition(async () => {
      await deleteTimelineEvent(contactId, eventId);
      router.refresh();
      toast.success("Event deleted.");
    });
  }

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Timeline</h2>
        {canEdit && (
          <button onClick={() => setShowForm(v => !v)}
            className="text-xs text-accent hover:underline">
            {showForm ? "Cancel" : "+ Log event"}
          </button>
        )}
      </div>

      {showForm && (
        <form
          action={async (fd) => {
            await formAction(fd);
            if (!state?.error) setShowForm(false);
          }}
          className="space-y-2 rounded-lg border border-border/60 p-3"
        >
          <div className="flex gap-2">
            <select name="eventType" defaultValue="note" className="input-field flex-1 text-xs">
              {EVENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <input name="title" placeholder="Title *" required className="input-field w-full text-xs" />
          <textarea name="body" placeholder="Details (optional)" rows={2}
            className="input-field w-full text-xs resize-none" />
          {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
          <button type="submit" disabled={pending}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50">
            {pending ? "Saving…" : "Add event"}
          </button>
        </form>
      )}

      <div className="space-y-0">
        {events.length === 0 && (
          <p className="text-xs text-white/30 text-center py-6">No timeline events yet.</p>
        )}
        {events.map((event, idx) => (
          <div key={event.id} className="flex gap-3 group">
            <div className="flex flex-col items-center">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-sm shrink-0 mt-1">
                {EVENT_ICONS[event.event_type as CrmTimelineEventType] ?? "•"}
              </div>
              {idx < events.length - 1 && (
                <div className="w-px flex-1 bg-border/40 my-1" />
              )}
            </div>
            <div className="pb-4 min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium">{event.title}</p>
                  {event.body && (
                    <p className="text-xs text-white/50 mt-0.5 whitespace-pre-line">{event.body}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-white/30">{timeAgo(event.created_at)}</span>
                  {(canAdmin || event.created_by === currentUserId) && (
                    <button
                      disabled={isDeleting}
                      onClick={() => handleDelete(event.id)}
                      aria-label="Delete event"
                      className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400/60 hover:text-red-400 transition disabled:opacity-30"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
