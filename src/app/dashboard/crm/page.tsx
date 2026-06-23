import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/dal";
import { ContactForm } from "./contact-form";

export default async function CrmPage() {
  const membership = await getActiveOrganization();
  const supabase = await createClient();

  const { data: contacts } = membership
    ? await supabase
        .from("crm_contacts")
        .select("id, full_name, email, phone, company, status, created_at")
        .eq("organization_id", membership.organization.id)
        .order("created_at", { ascending: false })
    : { data: [] };

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
            </tr>
          </thead>
          <tbody>
            {(contacts ?? []).map((contact) => (
              <tr key={contact.id} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-3">{contact.full_name}</td>
                <td className="px-5 py-3 text-white/60">{contact.email ?? "—"}</td>
                <td className="px-5 py-3 text-white/60">{contact.company ?? "—"}</td>
                <td className="px-5 py-3">
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs capitalize">
                    {contact.status}
                  </span>
                </td>
              </tr>
            ))}
            {(!contacts || contacts.length === 0) && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-white/40">
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
