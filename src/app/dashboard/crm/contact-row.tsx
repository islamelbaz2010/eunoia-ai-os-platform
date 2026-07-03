"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  softDeleteContact,
  restoreContact,
  archiveContact,
  unarchiveContact,
  hardDeleteContact,
} from "./actions";
import { PIPELINE_STAGES } from "@/lib/types";

type ContactSummary = {
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
};

const stageColor: Record<string, string> = {
  lead:        "bg-indigo-500/10 text-indigo-300",
  qualified:   "bg-cyan-500/10 text-cyan-300",
  proposal:    "bg-amber-500/10 text-amber-300",
  negotiation: "bg-orange-500/10 text-orange-300",
  won:         "bg-emerald-500/10 text-emerald-300",
  lost:        "bg-red-500/10 text-red-300",
};

export function ContactRow({
  contact,
  canDelete,
  canRestore,
  isDeleted,
  isArchived,
}: {
  contact: ContactSummary;
  canDelete: boolean;
  canRestore: boolean;
  isDeleted: boolean;
  isArchived: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<void>, successMsg: string) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        toast.success(successMsg);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Action failed.";
        setError(msg);
        toast.error(msg);
      }
    });
  }

  const stageLabel = PIPELINE_STAGES.find(s => s.value === contact.pipeline_stage)?.label ?? contact.pipeline_stage;

  return (
    <>
      <tr className={`hover:bg-white/2 transition ${isDeleted ? "opacity-50" : ""}`}>
        <td className="px-5 py-3">
          <Link
            href={`/dashboard/crm/${contact.id}`}
            className="font-medium hover:text-accent transition"
          >
            {contact.full_name}
          </Link>
          {isArchived && !isDeleted && (
            <span className="ml-2 rounded text-[10px] px-1.5 py-0.5 bg-white/10 text-white/40">archived</span>
          )}
          {isDeleted && (
            <span className="ml-2 rounded text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-400">deleted</span>
          )}
          {contact.phone && (
            <p className="text-xs text-white/40 mt-0.5">{contact.phone}</p>
          )}
        </td>
        <td className="px-5 py-3 text-white/50 hidden sm:table-cell text-xs">
          {contact.email ?? "—"}
        </td>
        <td className="px-5 py-3 text-white/50 hidden md:table-cell text-xs">
          {contact.company ?? "—"}
        </td>
        <td className="px-5 py-3">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${stageColor[contact.pipeline_stage] ?? "bg-white/10 text-white/60"}`}>
            {stageLabel}
          </span>
        </td>
        <td className="px-5 py-3">
          <div className="flex items-center justify-end gap-3 text-xs text-white/40">
            {!isDeleted && !isArchived && (
              <Link href={`/dashboard/crm/${contact.id}`}
                className="hover:text-white transition">
                View
              </Link>
            )}
            {!isDeleted && !isArchived && canDelete && (
              <button
                disabled={isPending}
                onClick={() => run(() => archiveContact(contact.id), "Contact archived.")}
                className="hover:text-white transition disabled:opacity-40"
              >
                Archive
              </button>
            )}
            {!isDeleted && isArchived && canRestore && (
              <button
                disabled={isPending}
                onClick={() => run(() => unarchiveContact(contact.id), "Contact restored.")}
                className="hover:text-white transition disabled:opacity-40"
              >
                Restore
              </button>
            )}
            {isDeleted && canRestore && (
              <button
                disabled={isPending}
                onClick={() => run(() => restoreContact(contact.id), "Contact restored.")}
                className="hover:text-emerald-400 transition disabled:opacity-40"
              >
                Restore
              </button>
            )}
            {!isDeleted && canDelete && (
              <button
                disabled={isPending}
                onClick={() => run(() => softDeleteContact(contact.id), "Contact deleted.")}
                className="hover:text-red-400 transition disabled:opacity-40"
              >
                Delete
              </button>
            )}
            {isDeleted && canDelete && (
              <button
                disabled={isPending}
                onClick={() => {
                  if (confirm(`Permanently delete "${contact.full_name}"? This cannot be undone.`)) {
                    run(() => hardDeleteContact(contact.id), "Contact permanently deleted.");
                  }
                }}
                className="hover:text-red-400 transition disabled:opacity-40"
              >
                Purge
              </button>
            )}
          </div>
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={5} className="px-5 pb-2 text-xs text-red-400">{error}</td>
        </tr>
      )}
    </>
  );
}
