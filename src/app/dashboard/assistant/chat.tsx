"use client";

import { useState, useTransition } from "react";
import { askAssistant, type AssistantResult } from "./actions";

type Source = { id: string; content: string; similarity: number };
type Message = { role: "user" | "assistant"; content: string; sources?: Source[] };

function SourcesPanel({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  if (sources.length === 0) return null;
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-white/40 hover:text-white/60"
      >
        {open ? "Hide" : "Show"} {sources.length} source{sources.length !== 1 ? "s" : ""}
      </button>
      {open && (
        <ol className="mt-2 space-y-2">
          {sources.map((source, i) => (
            <li key={source.id} className="rounded-lg bg-white/5 p-3 text-xs text-white/60">
              <span className="font-medium text-white/40">[{i + 1}]</span>{" "}
              {source.content.slice(0, 200)}
              {source.content.length > 200 ? "…" : ""}
              <span className="ml-2 text-white/30">
                {(source.similarity * 100).toFixed(0)}% match
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const value = String(formData.get("question") ?? "").trim();
    if (!value) return;

    setMessages((prev) => [...prev, { role: "user", content: value }]);
    setQuestion("");
    setError(undefined);

    startTransition(async () => {
      const result: AssistantResult = await askAssistant(value);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.answer ?? "", sources: result.sources ?? [] },
      ]);
    });
  }

  return (
    <div className="glass-panel flex min-h-[500px] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <p className="text-sm text-white/40">
            Ask about policies, procedures, or guest-facing information from your
            Knowledge Base.
          </p>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`max-w-[80%] ${
              message.role === "user" ? "ml-auto" : ""
            }`}
          >
            <div
              className={`rounded-xl px-4 py-2.5 text-sm ${
                message.role === "user"
                  ? "bg-accent text-white"
                  : "bg-white/5 text-white/80"
              }`}
            >
              {message.content}
            </div>
            {message.role === "assistant" && message.sources && (
              <SourcesPanel sources={message.sources} />
            )}
          </div>
        ))}
        {pending && <p className="text-sm text-white/40">Thinking...</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <form
        action={handleSubmit}
        className="flex gap-2 border-t border-border p-4"
      >
        <input
          name="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
