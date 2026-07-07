"use client";

import { useActionState } from "react";
import { createOrganization } from "./actions";

export default function OnboardingPage() {
  const [state, action, pending] = useActionState(createOrganization, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_440px] lg:items-center">
        <section className="hidden lg:block">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-2">
            Workspace setup
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-white">
            Give your team one place to ask, find, and act.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-white/58">
            Your workspace keeps knowledge documents, CRM contacts, AI usage, and audit logs scoped to the same organization.
          </p>
          <div className="mt-8 grid max-w-xl gap-3">
            {[
              "Knowledge stays private to this organization",
              "Team members can be invited from Settings",
              "The dashboard will guide your first setup actions",
            ].map((item) => (
              <div key={item} className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-white/65">
                {item}
              </div>
            ))}
          </div>
        </section>

        <div className="glass-panel w-full p-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-2">
            Step 2 of 2
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Create your workspace
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Use the property, group, or company name your team will recognize.
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
            <div className="rounded-lg border border-red-400/25 bg-red-400/8 px-3 py-2 text-sm text-red-200">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Preparing dashboard..." : "Create workspace"}
          </button>
          </form>
          <p className="mt-4 text-xs leading-5 text-white/40">
            You can invite teammates, update settings, and switch organizations later.
          </p>
        </div>
      </div>
    </main>
  );
}
