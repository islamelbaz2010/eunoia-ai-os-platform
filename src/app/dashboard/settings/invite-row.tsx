"use client";

import { useTransition } from "react";
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
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="px-5 py-3">{email}</td>
      <td className="px-5 py-3 capitalize text-white/60">{role}</td>
      <td className="px-5 py-3 text-right">
        <button
          disabled={pending}
          onClick={() => startTransition(() => revokeInvite(inviteId))}
          className="text-xs text-red-400 hover:underline disabled:opacity-50"
        >
          Revoke
        </button>
      </td>
    </tr>
  );
}
