export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-24 animate-pulse rounded-lg bg-white/5" />
      <div className="glass-panel animate-pulse overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-border/60 px-5" />
        ))}
      </div>
    </div>
  );
}
