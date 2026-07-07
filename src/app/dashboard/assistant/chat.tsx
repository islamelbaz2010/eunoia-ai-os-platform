"use client";

import { useState, useRef } from "react";

type Source = { id: string; content: string; similarity: number };
type Message = { role: "user" | "assistant"; content: string; sources?: Source[] };

type SseEvent =
  | { type: "sources"; sources: Source[] }
  | { type: "delta"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

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
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = question.trim();
    if (!value || streaming) return;

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: value },
      { role: "assistant", content: "", sources: [] },
    ]);
    setQuestion("");
    setError(undefined);
    setStreaming(true);

    try {
      const resp = await fetch("/api/assistant/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: value }),
        signal: abort.signal,
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const msg = (data as { error?: string }).error ?? "Request failed. Please try again.";
        setError(msg);
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      if (!resp.body) {
        setError("Your browser does not support streaming responses.");
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;

        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let event: SseEvent;
          try {
            event = JSON.parse(line.slice(6)) as SseEvent;
          } catch {
            continue;
          }

          if (event.type === "sources") {
            const sources = event.sources;
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant") {
                next[next.length - 1] = { ...last, sources };
              }
              return next;
            });
          } else if (event.type === "delta") {
            const token = event.content;
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant") {
                next[next.length - 1] = { ...last, content: last.content + token };
              }
              return next;
            });
          } else if (event.type === "error") {
            setError(event.message);
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              return last?.role === "assistant" && !last.content ? prev.slice(0, -1) : prev;
            });
          }
          // "done" — no action needed; setStreaming(false) happens in finally
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Connection error. Please try again.");
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          return last?.role === "assistant" && !last.content ? prev.slice(0, -1) : prev;
        });
      }
    } finally {
      setStreaming(false);
    }
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
            className={`max-w-[80%] ${message.role === "user" ? "ml-auto" : ""}`}
          >
            <div
              className={`rounded-xl px-4 py-2.5 text-sm ${
                message.role === "user"
                  ? "bg-accent text-white"
                  : "bg-white/5 text-white/80"
              }`}
            >
              {message.content || (streaming && index === messages.length - 1 ? null : "​")}
              {streaming && index === messages.length - 1 && message.role === "assistant" && (
                <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-white/60 align-middle" />
              )}
            </div>
            {message.role === "assistant" && message.sources && (
              <SourcesPanel sources={message.sources} />
            )}
          </div>
        ))}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-border p-4"
      >
        <input
          name="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          disabled={streaming}
          className="flex-1 rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={streaming || !question.trim()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {streaming ? "Generating…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
