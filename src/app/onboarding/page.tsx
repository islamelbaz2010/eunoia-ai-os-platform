"use client";

import { useActionState } from "react";
import { createOrganization } from "./actions";

export default function OnboardingPage() {
  const [state, action, pending] = useActionState(createOrganization, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-panel w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your workspace
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Set up your organization to get started with Eunoia AI OS.
        </p>

        <form action={action} className="mt-8 space-y-4">
          <div>
            <label htmlFor="name" className="text-sm text-white/70">
              Organization name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={80}
              className="mt-1 w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="Grand Nile Tower Hotel"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-400">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Creating workspace..." : "Create workspace"}
          </button>
        </form>
      </div>
    </main>
  );
}
