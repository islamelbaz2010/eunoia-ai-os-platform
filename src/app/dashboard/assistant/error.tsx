"use client";

export default function AssistantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="glass-panel p-6 text-center">
      <p className="text-sm text-white/60">
        Failed to load assistant.{error.digest ? ` (${error.digest})` : ""}
      </p>
      <button
        onClick={reset}
        className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
