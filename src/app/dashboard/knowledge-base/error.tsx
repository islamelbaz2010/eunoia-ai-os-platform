"use client";

export default function KnowledgeBaseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="glass-panel mx-auto max-w-xl p-6 text-center">
      <h1 className="text-lg font-semibold text-white">Knowledge Base could not load</h1>
      <p className="mt-2 text-sm leading-6 text-white/60">
        Your documents were not changed. Reload this view to fetch the latest knowledge records.{error.digest ? ` Reference: ${error.digest}` : ""}
      </p>
      <button
        onClick={reset}
        className="mt-5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Reload Knowledge Base
      </button>
    </div>
  );
}
