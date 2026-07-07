"use client";

export default function BillingError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <p className="text-sm text-white/50">Failed to load billing information.</p>
      <p className="text-xs text-white/30">{error.digest}</p>
      <button
        onClick={reset}
        className="rounded-lg border border-border px-4 py-2 text-sm text-white/60 hover:bg-white/5"
      >
        Try again
      </button>
    </div>
  );
}
