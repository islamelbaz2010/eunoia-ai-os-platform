"use client";

import { useState, useTransition } from "react";
import { deleteDocument } from "./actions";

type Document = {
  id: string;
  title: string;
  language: string;
  status: string;
  created_by: string | null;
};

export function DocumentRow({
  document,
  currentUserId,
  canDeleteAny,
}: {
  document: Document;
  currentUserId: string;
  canDeleteAny: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canDelete = canDeleteAny || document.created_by === currentUserId;

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteDocument(document.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete document.");
      }
    });
  }

  return (
    <>
      <tr className="border-b border-border/60 last:border-0">
        <td className="px-5 py-3">{document.title}</td>
        <td className="px-5 py-3 uppercase text-white/60">{document.language}</td>
        <td className="px-5 py-3">
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs capitalize">
            {document.status}
          </span>
        </td>
        <td className="px-5 py-3 text-right">
          {canDelete && (
            <button
              disabled={pending}
              onClick={handleDelete}
              className="text-xs text-red-400 hover:underline disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Delete"}
            </button>
          )}
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={4} className="px-5 pb-3 text-xs text-red-400">
            {error}
          </td>
        </tr>
      )}
    </>
  );
}
