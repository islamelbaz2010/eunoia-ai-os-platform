export default function KnowledgeBaseLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-white/5" />
      <div className="glass-panel h-40 animate-pulse p-5" />
      <div className="glass-panel animate-pulse overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-border/60 px-5" />
        ))}
      </div>
    </div>
  );
}
