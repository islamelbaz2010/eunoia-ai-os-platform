"use client";

import { useState, useTransition } from "react";
import { deleteContact } from "./actions";

type Contact = {
  id: string;
  full_name: string;
  email: string | null;
  company: string | null;
  status: string;
};

export function ContactRow({
  contact,
  canDelete,
}: {
  contact: Contact;
  canDelete: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteContact(contact.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete contact.");
      }
    });
  }

  return (
    <>
      <tr className="border-b border-border/60 last:border-0">
        <td className="px-5 py-3">{contact.full_name}</td>
        <td className="px-5 py-3 text-white/60">{contact.email ?? "—"}</td>
        <td className="px-5 py-3 text-white/60">{contact.company ?? "—"}</td>
        <td className="px-5 py-3">
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs capitalize">
            {contact.status}
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
          <td colSpan={5} className="px-5 pb-3 text-xs text-red-400">
            {error}
          </td>
        </tr>
      )}
    </>
  );
}
