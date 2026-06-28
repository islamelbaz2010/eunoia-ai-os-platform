export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-28 animate-pulse rounded-lg bg-white/5" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="glass-panel h-24 animate-pulse p-5" />
      ))}
    </div>
  );
}
