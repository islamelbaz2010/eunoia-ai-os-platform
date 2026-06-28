import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/dal";
import { hasRole } from "@/lib/types";
import { ContactForm } from "./contact-form";
import { ContactRow } from "./contact-row";

export default async function CrmPage() {
  const membership = await getActiveOrganization();
  const supabase = await createClient();

  const { data: contacts } = membership
    ? await supabase
        .from("crm_contacts")
        .select("id, full_name, email, phone, company, status, created_at")
        .eq("organization_id", membership.organization.id)
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: [] };

  const canDelete = !!membership && hasRole(membership.role, "admin");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CRM</h1>
        <p className="mt-1 text-sm text-white/60">
          Manage guest and lead relationships for your property.
        </p>
      </div>

      <ContactForm />

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-white/50">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Company</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {(contacts ?? []).map((contact) => (
              <ContactRow
                key={contact.id}
                contact={contact}
                canDelete={canDelete}
              />
            ))}
            {(!contacts || contacts.length === 0) && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-white/40">
                  No contacts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
