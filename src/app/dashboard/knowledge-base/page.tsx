import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization, verifySession } from "@/lib/auth/dal";
import { hasRole } from "@/lib/types";
import { DocumentForm } from "./document-form";
import { DocumentRow } from "./document-row";

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
        <p className="mt-1 text-sm text-white/60">
          Documents that power your RAG assistant, in English, Arabic, Russian, and
          Italian.
        </p>
      </div>

      <DocumentForm />

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-white/50">
            <tr>
              <th className="px-5 py-3 font-medium">Title</th>
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
                <td colSpan={4} className="px-5 py-6 text-center text-white/40">
                  No documents yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
