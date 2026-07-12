import { BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, verifySession } from "@/lib/auth/dal";
import { hasRole } from "@/lib/types";
import { DocumentForm } from "./document-form";
import { DocumentRow } from "./document-row";
import { EmptyState } from "../empty-state";

export default async function KnowledgeBasePage() {
  const [session, membership] = await Promise.all([
    verifySession(),
    getActiveOrganization(),
  ]);

  const supabase = await createClient();

  const { data: documents } = membership
    ? await supabase
        .from("knowledge_base_documents")
        .select("id, title, status, language, created_by, updated_at")
        .eq("organization_id", membership.organization.id)
        .order("updated_at", { ascending: false })
        .limit(100)
    : { data: [] };

  const canDeleteAny = !!membership && hasRole(membership.role, "admin");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-white/60">
          Add the policies, menus, FAQs, and SOPs your team already uses. Each document becomes source material for cited AI answers.
        </p>
      </div>

      <DocumentForm />

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-white/50">
            <tr>
              <th className="px-5 py-3 font-medium">
                Title
                {documents && documents.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-white/30">
                    {documents.length}{documents.length === 100 ? " (showing first 100)" : ""}
                  </span>
                )}
              </th>
              <th className="px-5 py-3 font-medium">Language</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {(documents ?? []).map((doc) => (
              <DocumentRow
                key={doc.id}
                document={doc}
                currentUserId={session.userId}
                canDeleteAny={canDeleteAny}
              />
            ))}
            {(!documents || documents.length === 0) && (
              <tr>
                <td colSpan={4} className="px-5 py-8">
                  <EmptyState
                    icon={BookOpen}
                    title="Your assistant is waiting for its first source"
                    description="Paste one high-value policy, FAQ, menu, or procedure above. After embedding, staff can ask questions and see source citations."
                    actions={[{ href: "/dashboard/assistant", label: "Open assistant", variant: "secondary" }]}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
