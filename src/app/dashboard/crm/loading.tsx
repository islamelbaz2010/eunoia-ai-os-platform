export default function CrmLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-white/8" />
        <div className="h-4 w-full max-w-lg animate-pulse rounded-lg bg-white/5" />
      </div>
      <div className="glass-panel h-28 animate-pulse p-5" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-7 w-24 animate-pulse rounded-full bg-white/5" />
        ))}
      </div>
      <div className="glass-panel animate-pulse overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-border/60 px-5" />
        ))}
      </div>
    </div>
  );
}
