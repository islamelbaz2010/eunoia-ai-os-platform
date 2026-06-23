"use client";

import { useTransition } from "react";
import type { OrgRole } from "@/lib/types";
import { updateMemberRole, removeMember } from "./actions";

export function MemberRow({
  memberId,
  name,
  role,
  canManage,
}: {
  memberId: string;
  name: string;
  role: OrgRole;
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="px-5 py-3">{name}</td>
      <td className="px-5 py-3">
        {canManage ? (
          <select
            defaultValue={role}
            disabled={pending}
            onChange={(e) =>
              startTransition(() =>
                updateMemberRole(memberId, e.target.value as OrgRole)
              )
            }
            className="rounded-lg border border-border bg-white/5 px-2 py-1 text-xs outline-none focus:border-accent"
          >
            <option value="viewer">Viewer</option>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select>
        ) : (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs capitalize">
            {role}
          </span>
        )}
      </td>
      <td className="px-5 py-3 text-right">
        {canManage && (
          <button
            disabled={pending}
            onClick={() => startTransition(() => removeMember(memberId))}
            className="text-xs text-red-400 hover:underline disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </td>
    </tr>
  );
}
