"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type ResetPasswordState } from "@/lib/auth/actions";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(
    requestPasswordReset,
    undefined
  );

  if (state?.success) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="glass-panel w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="mt-3 text-sm text-white/60">
            If an account exists for that address, we&apos;ve sent a password reset link.
            It expires in 1 hour.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm text-accent-2 hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-panel w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
        <p className="mt-1 text-sm text-white/60">
          Enter your email and we&apos;ll send a reset link.
        </p>

        <form action={action} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="text-sm text-white/70">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="you@hotel.com"
            />
          </div>

          {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/60">
          Remembered it?{" "}
          <Link href="/login" className="text-accent-2 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
