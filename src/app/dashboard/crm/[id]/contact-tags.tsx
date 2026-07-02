"use client";

import { useTransition, useState, useActionState } from "react";
import { assignTag, removeTag, createTag } from "../actions";
import type { CrmTag } from "@/lib/types";

export function ContactTags({
  contactId,
  contactTags,
  allTags,
  orgId: _orgId,
  canEdit,
  canAdmin,
}: {
  contactId: string;
  contactTags: CrmTag[];
  allTags: CrmTag[];
  orgId: string;
  canEdit: boolean;
  canAdmin: boolean;
}) {
  const [, transition] = useTransition();
  const [showNewTag, setShowNewTag] = useState(false);
  const [tagState, tagAction, tagPending] = useActionState(createTag, undefined);
  const [color, setColor] = useState("#6366f1");

  const assignedIds = new Set(contactTags.map(t => t.id));
  const unassigned  = allTags.filter(t => !assignedIds.has(t.id));

  return (
    <div className="glass-panel p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Tags</h2>
        {canEdit && (
          <button onClick={() => setShowNewTag(v => !v)}
            className="text-xs text-accent hover:underline">
            {showNewTag ? "Cancel" : "+ New tag"}
          </button>
        )}
      </div>

      {/* Assigned tags */}
      <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
        {contactTags.length === 0 && (
          <span className="text-xs text-white/30">No tags assigned.</span>
        )}
        {contactTags.map(tag => (
          <span
            key={tag.id}
            className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ backgroundColor: `${tag.color}18`, color: tag.color, border: `1px solid ${tag.color}30` }}
          >
            {tag.name}
            {canEdit && (
              <button
                onClick={() => transition(() => { void removeTag(contactId, tag.id); })}
                className="opacity-60 hover:opacity-100 ml-0.5 leading-none"
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Assign existing tags */}
      {canEdit && unassigned.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unassigned.map(tag => (
            <button
              key={tag.id}
              onClick={() => transition(() => { void assignTag(contactId, tag.id); })}
              className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs border border-dashed transition hover:opacity-80"
              style={{ borderColor: `${tag.color}40`, color: `${tag.color}80` }}
            >
              + {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* Create new tag */}
      {(canEdit || canAdmin) && showNewTag && (
        <form action={tagAction} className="flex items-center gap-2">
          <input
            type="color"
            name="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="h-7 w-7 cursor-pointer rounded border border-border bg-transparent"
          />
          <input name="name" placeholder="Tag name" required maxLength={40}
            className="input-field flex-1 text-xs" />
          <button type="submit" disabled={tagPending}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 shrink-0">
            {tagPending ? "…" : "Create"}
          </button>
        </form>
      )}
      {tagState?.error && <p className="text-xs text-red-400">{tagState.error}</p>}
    </div>
  );
}
