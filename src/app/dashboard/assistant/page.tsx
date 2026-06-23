import { AssistantChat } from "./chat";

export default function AssistantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">RAG Assistant</h1>
        <p className="mt-1 text-sm text-white/60">
          Ask questions grounded in your organization&apos;s Knowledge Base.
        </p>
      </div>

      <AssistantChat />
    </div>
  );
}
