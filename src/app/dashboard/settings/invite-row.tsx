"use client";

import { useState, useTransition } from "react";
import { revokeInvite } from "./actions";

export function InviteRow({
  inviteId,
  email,
  role,
}: {
  inviteId: string;
  email: string;
  role: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRevoke() {
    setError(null);
    startTransition(async () => {
      try {
        await revokeInvite(inviteId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to revoke invite.");
      }
    });
  }

  return (
    <>
      <tr className="border-b border-border/60 last:border-0">
        <td className="px-5 py-3">{email}</td>
        <td className="px-5 py-3 capitalize text-white/60">{role}</td>
        <td className="px-5 py-3 text-right">
          <button
            disabled={pending}
            onClick={handleRevoke}
            className="text-xs text-red-400 hover:underline disabled:opacity-50"
          >
            Revoke
          </button>
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={3} className="px-5 pb-3 text-xs text-red-400">
            {error}
          </td>
        </tr>
      )}
    </>
  );
}
