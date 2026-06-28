"use client";

import { useState, useTransition } from "react";
import type { OrgRole } from "@/lib/types";
import { updateMemberRole, removeMember } from "./actions";

export function MemberRow({
  memberId,
  name,
  role,
  canManage,
  isOwner,
}: {
  memberId: string;
  name: string;
  role: OrgRole;
  canManage: boolean;
  isOwner: boolean;
}) {
  const [currentRole, setCurrentRole] = useState<OrgRole>(role);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRoleChange(newRole: OrgRole) {
    const prevRole = currentRole;
    setCurrentRole(newRole);
    setError(null);
    startTransition(async () => {
      try {
        await updateMemberRole(memberId, newRole);
      } catch (e) {
        setCurrentRole(prevRole);
        setError(e instanceof Error ? e.message : "Failed to update role.");
      }
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      try {
        await removeMember(memberId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to remove member.");
      }
    });
  }

  return (
    <>
      <tr className="border-b border-border/60 last:border-0">
        <td className="px-5 py-3">{name}</td>
        <td className="px-5 py-3">
          {canManage ? (
            <select
              value={currentRole}
              disabled={pending}
              onChange={(e) => handleRoleChange(e.target.value as OrgRole)}
              className="rounded-lg border border-border bg-white/5 px-2 py-1 text-xs outline-none focus:border-accent"
            >
              <option value="viewer">Viewer</option>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              {isOwner && <option value="owner">Owner</option>}
            </select>
          ) : (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs capitalize">
              {currentRole}
            </span>
          )}
        </td>
        <td className="px-5 py-3 text-right">
          {canManage && (
            <button
              disabled={pending}
              onClick={handleRemove}
              className="text-xs text-red-400 hover:underline disabled:opacity-50"
            >
              Remove
            </button>
          )}
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
