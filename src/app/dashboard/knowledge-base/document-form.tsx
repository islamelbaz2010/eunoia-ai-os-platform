"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createDocument } from "./actions";

export function DocumentForm() {
  const [state, action, pending] = useActionState(createDocument, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      toast.success("Knowledge document embedded.");
      formRef.current?.reset();
    }
  }, [state?.success]);

  return (
    <form ref={formRef} action={action} className="glass-panel flex flex-col gap-4 p-5">
      <div>
        <p className="text-sm font-medium text-white">Add knowledge</p>
        <p className="mt-1 text-xs leading-5 text-white/45">
          Start with one high-value source your team answers from every week.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
        <input
          name="title"
          placeholder="Example: Weekend breakfast policy"
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
        placeholder="Paste the policy, FAQ, menu, or procedure content here..."
        required
        rows={6}
        maxLength={50000}
        className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <p className="text-xs text-white/35">
        Tip: include exact hours, prices, eligibility rules, and exceptions. The assistant cites this content later.
      </p>
      {state?.error && (
        <div className="rounded-lg border border-red-400/25 bg-red-400/8 px-3 py-2 text-sm text-red-200">
          {state.error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-60 sm:w-fit"
      >
        {pending ? "Embedding trusted source..." : "Add to Knowledge Base"}
      </button>
    </form>
  );
}
