export default function ContactDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-pulse">
      <div className="h-4 w-32 rounded bg-white/5" />
      <div className="glass-panel p-6 space-y-4">
        <div className="flex gap-4">
          <div className="h-12 w-12 rounded-full bg-white/5" />
          <div className="space-y-2">
            <div className="h-5 w-48 rounded bg-white/5" />
            <div className="h-3 w-32 rounded bg-white/5" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 border-t border-border pt-4">
          {[1,2,3].map(i => <div key={i} className="h-10 rounded bg-white/5" />)}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-panel h-64 p-4 space-y-3">
          <div className="h-4 w-24 rounded bg-white/5" />
          {[1,2,3].map(i => <div key={i} className="h-12 rounded bg-white/5" />)}
        </div>
        <div className="glass-panel h-64 p-4 space-y-3">
          <div className="h-4 w-24 rounded bg-white/5" />
          {[1,2,3].map(i => <div key={i} className="h-12 rounded bg-white/5" />)}
        </div>
      </div>
    </div>
  );
}
