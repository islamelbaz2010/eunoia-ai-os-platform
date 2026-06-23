"use client";

import { useActionState } from "react";
import { createInvite } from "./actions";

export function InviteForm() {
  const [state, action, pending] = useActionState(createInvite, undefined);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="flex-1">
        <label className="text-xs text-white/50">Email</label>
        <input
          name="email"
          type="email"
          required
          placeholder="colleague@hotel.com"
          className="mt-1 w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="text-xs text-white/50">Role</label>
        <select
          name="role"
          defaultValue="member"
          className="mt-1 rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
        >
          <option value="viewer">Viewer</option>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Sending..." : "Send invite"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-400">{state.error}</p>}
      {state?.success && (
        <p className="w-full text-sm text-emerald-400">{state.success}</p>
      )}
    </form>
  );
}
