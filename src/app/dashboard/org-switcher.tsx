"use client";

import { switchOrganization } from "@/lib/auth/actions";
import type { OrgRole, Organization } from "@/lib/types";

export function OrgSwitcher({
  memberships,
  activeOrganizationId,
}: {
  memberships: { role: OrgRole; organization: Organization }[];
  activeOrganizationId: string;
}) {
  return (
    <form action={switchOrganization} className="mt-1">
      <select
        name="organizationId"
        defaultValue={activeOrganizationId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="w-full truncate rounded-md border border-border bg-white/5 px-1.5 py-1 text-xs text-white/70 outline-none focus:border-accent"
      >
        {memberships.map((m) => (
          <option key={m.organization.id} value={m.organization.id}>
            {m.organization.name}
          </option>
        ))}
      </select>
    </form>
  );
}
