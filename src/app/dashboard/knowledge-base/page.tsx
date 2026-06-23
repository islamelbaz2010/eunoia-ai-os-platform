import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/dal";
import { DocumentForm } from "./document-form";

export default async function KnowledgeBasePage() {
  const membership = await getActiveOrganization();
  const supabase = await createClient();

  const { data: documents } = membership
    ? await supabase
        .from("knowledge_base_documents")
        .select("id, title, status, language, updated_at")
        .eq("organization_id", membership.organization.id)
        .order("updated_at", { ascending: false })
    : { data: [] };

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
            </tr>
          </thead>
          <tbody>
            {(documents ?? []).map((doc) => (
              <tr key={doc.id} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-3">{doc.title}</td>
                <td className="px-5 py-3 text-white/60 uppercase">{doc.language}</td>
                <td className="px-5 py-3">
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs capitalize">
                    {doc.status}
                  </span>
                </td>
              </tr>
            ))}
            {(!documents || documents.length === 0) && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-white/40">
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
