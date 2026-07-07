const steps = [
  {
    number: "01",
    title: "Upload your knowledge",
    body: "Paste your check-in policy, F&B menu, diving safety protocol, group rate sheet — any text content. Eunoia indexes it automatically using AI embeddings. First document takes under 30 seconds.",
    detail: "Supports English, Arabic, Russian, Italian. Up to 50,000 characters per document.",
    visual: (
      <div className="rounded-xl border border-white/8 bg-[#0c0d12] p-4 text-sm font-mono">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/6">
          <div className="w-2 h-2 rounded-full bg-accent-2" />
          <span className="text-white/40 text-xs">knowledge-base / Add document</span>
        </div>
        <div className="space-y-2">
          <div className="flex gap-2">
            <span className="text-white/25">Title</span>
            <span className="text-white/70">Late Check-Out Policy 2026</span>
          </div>
          <div className="flex gap-2">
            <span className="text-white/25">Language</span>
            <span className="text-accent-2">English</span>
          </div>
          <div className="mt-3 text-white/40 text-xs leading-relaxed border-l-2 border-accent/30 pl-3">
            Standard check-out is 12:00 PM. Late check-out until 4 PM is
            available at EGP 500 per 2-hour block, subject to availability.
            Guests in…
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-white/6">
            <div className="h-1 w-3/4 rounded-full bg-gradient-to-r from-accent to-accent-2" />
          </div>
          <span className="text-xs text-accent-2">Indexing…</span>
        </div>
      </div>
    ),
  },
  {
    number: "02",
    title: "Your team asks in plain language",
    body: "Staff opens the RAG Assistant and asks — exactly like a WhatsApp message. No training required. Works from any device browser. No app download needed.",
    detail: "Arabic and English in the same session. Rate-limited to keep costs predictable.",
    visual: (
      <div className="rounded-xl border border-white/8 bg-[#0c0d12] p-4">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/6">
          <div className="w-2 h-2 rounded-full bg-accent-2" />
          <span className="text-white/40 text-xs font-mono">RAG Assistant</span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-end">
            <div className="bg-accent/25 border border-accent/30 rounded-xl rounded-tr-sm px-3 py-2 text-sm text-white/85 max-w-[85%]">
              What is the late check-out fee for a deluxe room?
            </div>
          </div>
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/8 rounded-xl rounded-tl-sm px-3 py-2.5 text-sm text-white/75 max-w-[88%]">
              <p>Late check-out is <span className="text-white font-medium">EGP 500 per 2-hour block</span> until 4 PM, subject to availability.</p>
              <div className="mt-1.5 flex items-center gap-1.5 border-t border-white/8 pt-1.5">
                <div className="w-1 h-1 rounded-full bg-accent-2" />
                <span className="text-xs text-accent-2">Late Check-Out Policy 2026 · 98%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    number: "03",
    title: "Cited answers. Every time.",
    body: "Every answer shows the source document and similarity score. If the knowledge base doesn't contain the answer, the AI says so — it never invents information. You always know where the answer came from.",
    detail: "Full audit trail. Usage logged per user, per organization.",
    visual: (
      <div className="rounded-xl border border-white/8 bg-[#0c0d12] p-4">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/6">
          <div className="w-2 h-2 rounded-full bg-accent-2" />
          <span className="text-white/40 text-xs font-mono">Usage / Audit Logs</span>
        </div>
        <div className="space-y-2">
          {[
            { user: "Sara M.", action: "Asked: late check-out fee", time: "2m ago", score: "98%" },
            { user: "Omar K.", action: "Asked: VIP breakfast hours", time: "8m ago", score: "94%" },
            { user: "Nour A.", action: "Uploaded: F&B Menu Q3", time: "1h ago", score: "—" },
          ].map(({ user, action, time, score }) => (
            <div key={user} className="flex items-center justify-between py-1.5 border-b border-white/4 last:border-0">
              <div>
                <p className="text-xs text-white/70">{user}</p>
                <p className="text-xs text-white/35">{action}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/30">{time}</p>
                {score !== "—" && <p className="text-xs text-accent-2">{score} match</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="landing-section bg-[#0a0b0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent/70 mb-3">How It Works</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight gradient-text">
            From zero to AI-powered in two hours.
          </h2>
          <p className="mt-4 text-base text-white/50">
            No integrations. No APIs to configure. No training data to label. Just paste and go.
          </p>
        </div>

        <div className="space-y-12 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-8">
          {steps.map(({ number, title, body, detail, visual }, i) => (
            <div key={number} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-[calc(100%+1rem)] w-[calc(100%-2rem)] h-px bg-gradient-to-r from-white/10 to-transparent z-10" />
              )}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent-2/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-accent">{number}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-sm text-white/50 leading-relaxed">{body}</p>
                  <p className="mt-2 text-xs text-white/30">{detail}</p>
                </div>
              </div>
              {visual}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
