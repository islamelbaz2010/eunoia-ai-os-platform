const pillars = [
  {
    label: "Knowledge Base",
    headline: "One source of truth for your entire property",
    body: "Paste any policy, menu, SOP, or protocol. The AI indexes it in seconds using semantic embeddings. Every document lives in one place, searchable by meaning — not just keywords.",
    features: [
      "Automatic AI indexing on save",
      "Supports Arabic, English, Russian, Italian",
      "Up to 50,000 characters per document",
      "Semantic HNSW vector search",
    ],
    color: "from-accent/20 to-transparent",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M4 6h20M4 10h20M4 14h12" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M20 18l2 2 4-4" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "RAG Assistant",
    headline: "Questions answered from your documents, not the internet",
    body: "Your team asks in plain language. Eunoia AI finds the relevant knowledge, cites the source, and delivers a precise answer. No hallucinations. No invented policies.",
    features: [
      "Powered by GPT-4o-mini",
      "Source citations on every answer",
      "Hallucination-proof by design",
      "50 queries per user per hour",
    ],
    color: "from-accent-2/15 to-transparent",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="14" cy="14" r="10" stroke="#6366f1" strokeWidth="1.8" />
        <path d="M10 14h8M14 10v8" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "CRM",
    headline: "Every guest relationship, fully tracked",
    body: "A hospitality-native CRM with a visual pipeline, contact timeline, activities, and tags. Import your existing contacts. Track deals from first inquiry to checkout.",
    features: [
      "Lead → Qualified → Won pipeline",
      "Timeline: calls, meetings, notes",
      "CSV import in seconds",
      "AI-powered contact insights",
    ],
    color: "from-purple-500/10 to-transparent",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="9" r="4" stroke="#6366f1" strokeWidth="1.8" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M17 5.13a4 4 0 0 1 0 7.75" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function Solution() {
  return (
    <section id="features" className="landing-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent/70 mb-3">The Solution</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight gradient-text leading-tight">
            One platform. Three capabilities.
          </h2>
          <p className="mt-4 text-lg text-white/50 leading-relaxed">
            Everything your property needs to go from scattered knowledge to instant answers — deployed in one afternoon.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {pillars.map(({ label, headline, body, features, color, icon }) => (
            <div
              key={label}
              className="relative rounded-2xl border border-white/8 bg-white/2 p-7 hover:border-white/14 transition-all duration-200 overflow-hidden group"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-60 group-hover:opacity-80 transition-opacity pointer-events-none`} />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center mb-5">
                  {icon}
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">{label}</p>
                <h3 className="text-lg font-semibold text-white leading-snug mb-3">{headline}</h3>
                <p className="text-sm text-white/50 leading-relaxed mb-6">{body}</p>
                <ul className="space-y-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/60">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 shrink-0" aria-hidden="true">
                        <path d="M2 7l3.5 3.5L12 3" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
