"use client";

import { useTransition } from "react";
import type { OrganizationMembership } from "@/lib/types";
import { switchOrganization } from "./org-switcher-actions";

export function OrgSwitcher({
  memberships,
  activeOrgId,
}: {
  memberships: OrganizationMembership[];
  activeOrgId: string;
}) {
  const [isPending, startTransition] = useTransition();

  if (memberships.length <= 1) return null;

  return (
    <select
      value={activeOrgId}
      disabled={isPending}
      onChange={(e) => {
        const orgId = e.target.value;
        startTransition(() => {
          void switchOrganization(orgId);
        });
      }}
      className="w-full truncate rounded-lg border border-border bg-transparent px-2 py-1 text-xs text-white/70 transition focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50"
      aria-label="Switch organization"
    >
      {memberships.map((m) => (
        <option key={m.organization.id} value={m.organization.id}>
          {m.organization.name}
        </option>
      ))}
    </select>
  );
}
