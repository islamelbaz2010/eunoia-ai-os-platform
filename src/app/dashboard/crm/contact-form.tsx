"use client";

import { useActionState } from "react";
import { createContact } from "./actions";

export function ContactForm() {
  const [state, action, pending] = useActionState(createContact, undefined);

  return (
    <form action={action} className="glass-panel grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
      <input
        name="fullName"
        placeholder="Full name"
        required
        maxLength={100}
        className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <input
        name="email"
        type="email"
        placeholder="Email"
        className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <input
        name="phone"
        placeholder="Phone"
        maxLength={30}
        className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <input
        name="company"
        placeholder="Company"
        maxLength={100}
        className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {state?.error && (
        <p className="col-span-full text-sm text-red-400">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="col-span-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 sm:w-fit"
      >
        {pending ? "Adding..." : "Add contact"}
      </button>
    </form>
  );
}
