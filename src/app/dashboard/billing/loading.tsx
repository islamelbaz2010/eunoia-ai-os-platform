export default function BillingLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-24 animate-pulse rounded-md bg-white/5" />
        <div className="mt-1 h-4 w-72 animate-pulse rounded-md bg-white/5" />
      </div>
      <div className="glass-panel h-36 animate-pulse" />
      <div className="glass-panel h-40 animate-pulse" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass-panel h-56 animate-pulse" />
        <div className="glass-panel h-56 animate-pulse" />
        <div className="glass-panel h-56 animate-pulse" />
      </div>
    </div>
  );
}
