"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateContact, type ContactFormState } from "../actions";
import type { CrmContact } from "@/lib/types";

type Member = { id: string; user_id: string; role: string; profiles: { id: string; full_name: string | null } | null };

export function EditContactModal({
  contact,
  members,
}: {
  contact: CrmContact;
  members: Member[];
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ContactFormState>(undefined);
  const [pending, startTransition] = useTransition();

  function openModal() {
    setState(undefined);
    setOpen(true);
  }

  function closeModal() {
    setState(undefined);
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateContact(contact.id, state, fd);
      setState(result);
      if (!result?.error && !result?.duplicates) {
        toast.success("Contact updated.");
        closeModal();
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") closeModal();
  }

  if (!open) {
    return (
      <button
        onClick={openModal}
        className="shrink-0 rounded-lg border border-border px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition"
      >
        Edit
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={closeModal}
      />
      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label="Edit contact"
      >
        <div className="w-full max-w-2xl glass-panel shadow-2xl flex flex-col max-h-[90vh]">

          {/* Fixed header */}
          <div className="flex-none px-6 py-4 border-b border-border/40 flex items-center justify-between">
            <h2 className="text-base font-semibold">Edit contact</h2>
            <button
              onClick={closeModal}
              aria-label="Close modal"
              className="text-white/40 hover:text-white text-xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Scrollable form body */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <form id="edit-contact-form" onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="fullName"
                  defaultValue={contact.full_name}
                  placeholder="Full name *"
                  required
                  className="input-field col-span-2"
                />
                <input name="email" type="email" defaultValue={contact.email ?? ""} placeholder="Email"
                  className="input-field" />
                <input name="phone" defaultValue={contact.phone ?? ""} placeholder="Phone"
                  className="input-field" />
                <input name="company" defaultValue={contact.company ?? ""} placeholder="Company"
                  className="input-field" />
                <input name="website" type="url" defaultValue={contact.website ?? ""} placeholder="Website (https://…)"
                  className="input-field" />
                <input name="linkedinUrl" type="url" defaultValue={contact.linkedin_url ?? ""} placeholder="LinkedIn URL"
                  className="input-field" />
                <select name="stage" defaultValue={contact.pipeline_stage} className="input-field">
                  <option value="lead">Lead</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
                <select name="status" defaultValue={contact.status} className="input-field">
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
                <select name="ownerId" defaultValue={contact.owner_id ?? ""} className="input-field col-span-2">
                  <option value="">No owner</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profiles?.full_name ?? m.user_id} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                name="notes"
                defaultValue={contact.notes ?? ""}
                placeholder="Notes"
                rows={3}
                className="input-field w-full resize-none"
              />

              {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
              {state?.duplicates && state.duplicates.length > 0 && (
                <div className="rounded-lg border border-yellow-400/30 bg-yellow-400/5 p-3 text-xs">
                  <p className="text-yellow-300 mb-1">Another contact has this email:</p>
                  <ul className="text-white/60 mb-2 space-y-0.5">
                    {state.duplicates.map(d => (
                      <li key={d.id}>• {d.full_name} {d.email ? `(${d.email})` : ""}</li>
                    ))}
                  </ul>
                  <button
                    type="submit"
                    form="edit-contact-form"
                    name="confirmed"
                    value="true"
                    className="text-yellow-300 underline"
                  >
                    Save anyway
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Sticky footer — always visible */}
          <div className="flex-none border-t border-border/40 px-6 py-4 flex gap-2">
            <button
              type="submit"
              form="edit-contact-form"
              disabled={pending}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-border px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition"
            >
              Cancel
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
