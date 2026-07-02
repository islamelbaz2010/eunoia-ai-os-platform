"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import { updateContactStage } from "../actions";
import type { CrmPipelineStage } from "@/lib/types";

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

type Column = {
  value: CrmPipelineStage;
  label: string;
  color: string;
  contacts: PipelineContact[];
};

export function PipelineBoard({
  columns: initialColumns,
  canEdit,
}: {
  columns: Column[];
  canEdit: boolean;
}) {
  const [columns, setColumns] = useState(initialColumns);
  const [, startTransition] = useTransition();
  const draggingId = useRef<string | null>(null);
  const draggingFrom = useRef<CrmPipelineStage | null>(null);

  function onDragStart(e: React.DragEvent, contactId: string, fromStage: CrmPipelineStage) {
    draggingId.current   = contactId;
    draggingFrom.current = fromStage;
    e.dataTransfer.effectAllowed = "move";
    (e.currentTarget as HTMLElement).style.opacity = "0.5";
  }

  function onDragEnd(e: React.DragEvent) {
    (e.currentTarget as HTMLElement).style.opacity = "1";
    draggingId.current   = null;
    draggingFrom.current = null;
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function onDrop(e: React.DragEvent, toStage: CrmPipelineStage) {
    e.preventDefault();
    const contactId = draggingId.current;
    const fromStage = draggingFrom.current;
    if (!contactId || !fromStage || fromStage === toStage) return;

    // Optimistic update
    setColumns(prev =>
      prev.map(col => {
        if (col.value === fromStage) {
          return { ...col, contacts: col.contacts.filter(c => c.id !== contactId) };
        }
        if (col.value === toStage) {
          const moved = prev
            .find(c => c.value === fromStage)
            ?.contacts.find(c => c.id === contactId);
          if (!moved) return col;
          return {
            ...col,
            contacts: [{ ...moved, pipeline_stage: toStage }, ...col.contacts],
          };
        }
        return col;
      })
    );

    startTransition(async () => {
      try {
        await updateContactStage(contactId, toStage);
      } catch {
        // Revert on failure
        setColumns(initialColumns);
      }
    });
  }

  const totalContacts = columns.reduce((sum, col) => sum + col.contacts.length, 0);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {columns.map(col => (
          <div
            key={col.value}
            className="flex w-64 shrink-0 flex-col rounded-xl border border-border bg-white/2"
            onDragOver={onDragOver}
            onDrop={e => onDrop(e, col.value)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-xs font-semibold">{col.label}</span>
              </div>
              <span className="text-xs text-white/30">{col.contacts.length}</span>
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-2 p-3 min-h-[12rem]">
              {col.contacts.map(contact => (
                <div
                  key={contact.id}
                  draggable={canEdit}
                  onDragStart={e => onDragStart(e, contact.id, col.value)}
                  onDragEnd={onDragEnd}
                  className={`rounded-lg border border-border/60 bg-white/4 p-3 transition-shadow ${canEdit ? "cursor-grab active:cursor-grabbing hover:border-border hover:bg-white/6" : ""}`}
                >
                  <Link href={`/dashboard/crm/${contact.id}`} className="block">
                    <p className="text-xs font-medium hover:text-accent transition">{contact.full_name}</p>
                    {contact.company && (
                      <p className="text-[10px] text-white/40 mt-0.5">{contact.company}</p>
                    )}
                    {contact.email && (
                      <p className="text-[10px] text-white/30 mt-0.5 truncate">{contact.email}</p>
                    )}
                  </Link>
                </div>
              ))}
              {col.contacts.length === 0 && (
                <div className="flex items-center justify-center h-16 text-[10px] text-white/20 rounded-lg border border-dashed border-border/40">
                  Drop here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-white/30">
        {totalContacts} contacts in pipeline
        {canEdit ? " · Drag to move between stages" : ""}
      </p>
    </div>
  );
}
