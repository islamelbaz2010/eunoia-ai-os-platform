"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createContact } from "./actions";

export function QuickAddContact() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createContact, undefined);
  const wasSubmitting = useRef(false);

  // Detect completed submission: pending transitions true → false
  useEffect(() => {
    if (wasSubmitting.current && !pending) {
      if (!state?.error && !state?.duplicates) {
        toast.success("Contact added.");
        setOpen(false);
      }
    }
    wasSubmitting.current = pending;
  }, [pending, state]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 px-5 py-3 text-sm text-white/40 hover:text-white hover:border-border transition w-full"
      >
        <span className="text-base leading-none">+</span>
        Add contact
      </button>
    );
  }

  return (
    <form
      action={action}
      className="glass-panel p-5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">New contact</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close form"
          className="text-white/40 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input name="fullName" placeholder="Full name *" required maxLength={100}
          className="input-field" />
        <input name="email" type="email" placeholder="Email"
          className="input-field" />
        <input name="phone" placeholder="Phone" maxLength={30}
          className="input-field" />
        <input name="company" placeholder="Company" maxLength={200}
          className="input-field" />
        <input name="website" type="url" placeholder="Website (https://…)" maxLength={300}
          className="input-field" />
        <input name="linkedinUrl" type="url" placeholder="LinkedIn URL" maxLength={300}
          className="input-field" />
        <select name="stage" defaultValue="lead" className="input-field">
          <option value="lead">Lead</option>
          <option value="qualified">Qualified</option>
          <option value="proposal">Proposal</option>
          <option value="negotiation">Negotiation</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
        <select name="source" defaultValue="manual" className="input-field">
          <option value="manual">Manual entry</option>
          <option value="website">Website</option>
          <option value="referral">Referral</option>
          <option value="import">Import</option>
          <option value="other">Other</option>
        </select>
      </div>
      <textarea name="notes" placeholder="Notes" rows={2} maxLength={5000}
        className="input-field w-full resize-none" />

      {state?.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}
      {state?.duplicates && state.duplicates.length > 0 && (
        <div className="rounded-lg border border-yellow-400/30 bg-yellow-400/5 p-3 text-xs">
          <p className="font-medium text-yellow-300 mb-1">Possible duplicates found:</p>
          <ul className="space-y-0.5 text-white/60 mb-2">
            {state.duplicates.map((d) => (
              <li key={d.id}>• {d.full_name} {d.email ? `(${d.email})` : ""}</li>
            ))}
          </ul>
          <button type="submit" name="confirmed" value="true"
            className="text-yellow-300 underline text-xs">
            Add anyway
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
          {pending ? "Adding…" : "Add contact"}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="rounded-lg border border-border px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition">
          Cancel
        </button>
      </div>
    </form>
  );
}
