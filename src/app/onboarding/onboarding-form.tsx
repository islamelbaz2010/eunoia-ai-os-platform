"use client";

import { useActionState } from "react";
import { createOrganization } from "./actions";

export function OnboardingForm() {
  const [state, action, pending] = useActionState(createOrganization, undefined);

  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label htmlFor="organizationName" className="text-sm text-white/70">
          Organization name
        </label>
        <input
          id="organizationName"
          name="organizationName"
          type="text"
          required
          className="mt-1 w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder="Red Sea Diving Resort"
        />
      </div>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Creating workspace..." : "Create workspace"}
      </button>
    </form>
  );
}
