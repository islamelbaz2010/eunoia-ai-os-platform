"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center px-4">
      <div className="glass-panel max-w-md p-8 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-white/60">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-xs text-white/30">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
