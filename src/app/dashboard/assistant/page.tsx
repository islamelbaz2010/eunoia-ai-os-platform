export default function AssistantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">RAG Assistant</h1>
        <p className="mt-1 text-sm text-white/60">
          Ask questions grounded in your organization&apos;s Knowledge Base.
        </p>
      </div>

      <div className="glass-panel flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
        <p className="text-white/60">
          The assistant will answer using your published Knowledge Base documents.
        </p>
        <p className="mt-2 text-sm text-white/40">
          Connect an embeddings pipeline to knowledge_base_chunks to enable retrieval.
        </p>
      </div>
    </div>
  );
}
