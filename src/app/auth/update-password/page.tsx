"use client";

import { useActionState } from "react";
import { updatePassword, type ResetPasswordState } from "@/lib/auth/actions";

export default function UpdatePasswordPage() {
  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(
    updatePassword,
    undefined
  );

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-panel w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Set new password</h1>
        <p className="mt-1 text-sm text-white/60">
          Choose a strong password for your account.
        </p>

        <form action={action} className="mt-8 space-y-4">
          <div>
            <label htmlFor="password" className="text-sm text-white/70">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="text-sm text-white/70">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="Repeat your password"
            />
          </div>

          {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}
