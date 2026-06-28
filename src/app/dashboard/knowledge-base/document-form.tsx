"use client";

import { useActionState } from "react";
import { createDocument } from "./actions";

export function DocumentForm() {
  const [state, action, pending] = useActionState(createDocument, undefined);

  return (
    <form action={action} className="glass-panel flex flex-col gap-3 p-5">
      <div className="flex gap-3">
        <input
          name="title"
          placeholder="Document title"
          required
          className="flex-1 rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <select
          name="language"
          defaultValue="en"
          className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
        >
          <option value="en">English</option>
          <option value="ar">Arabic</option>
          <option value="ru">Russian</option>
          <option value="it">Italian</option>
        </select>
      </div>
      <textarea
        name="content"
        placeholder="Paste policy, FAQ, or procedure content here..."
        required
        rows={6}
        maxLength={50000}
        className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 sm:w-fit"
      >
        {pending ? "Embedding & saving..." : "Add to Knowledge Base"}
      </button>
    </form>
  );
}
