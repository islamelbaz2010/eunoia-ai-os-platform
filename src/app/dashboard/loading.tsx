export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-3 w-28 animate-pulse rounded-full bg-accent-2/20" />
        <div className="h-8 w-48 animate-pulse rounded-lg bg-white/8" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded-lg bg-white/5" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="kpi-card h-28 animate-pulse p-5" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass-panel h-72 animate-pulse p-5 lg:col-span-2" />
        <div className="glass-panel h-72 animate-pulse p-5" />
      </div>
    </div>
  );
}
