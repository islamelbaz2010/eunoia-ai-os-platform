export default function UsageLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-white/8" />
        <div className="h-4 w-full max-w-lg animate-pulse rounded-lg bg-white/5" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="kpi-card h-28 animate-pulse p-5" />
        ))}
      </div>
    </div>
  );
}
