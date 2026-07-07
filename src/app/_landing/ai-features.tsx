function KBMockup() {
  const docs = [
    { title: "F&B Menu — Rooftop Terrace", lang: "EN", chunks: 42, status: "indexed" },
    { title: "VIP Guest Protocol — Ramadan", lang: "AR", chunks: 28, status: "indexed" },
    { title: "Diving Safety Briefing", lang: "EN", chunks: 15, status: "indexed" },
    { title: "Group Rate Sheet Q3 2026", lang: "EN", chunks: 7, status: "indexing" },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c0d12] overflow-hidden shadow-2xl shadow-black/50">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-white/2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
        </div>
        <span className="ml-2 text-xs text-white/35 font-medium">Knowledge Base — Grand Nile Tower Hotel</span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-white/70">4 documents · 92 indexed chunks</p>
          <button type="button" className="rounded-lg bg-accent/20 border border-accent/30 px-3 py-1 text-xs text-accent font-medium">
            + Add document
          </button>
        </div>
        <div className="space-y-2">
          {docs.map(({ title, lang, chunks, status }) => (
            <div
              key={title}
              className="flex items-center justify-between rounded-xl border border-white/6 bg-white/3 px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M2 2h6l4 4v6H2V2z" stroke="#6366f1" strokeWidth="1.2" strokeLinejoin="round" />
                    <path d="M8 2v4h4" stroke="#6366f1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-white/80 truncate">{title}</p>
                  <p className="text-xs text-white/35">{lang} · {chunks} chunks</p>
                </div>
              </div>
              <div className="shrink-0 ml-3">
                {status === "indexed" ? (
                  <span className="flex items-center gap-1.5 text-xs text-accent-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-2" />
                    Indexed
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-amber-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Indexing
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AssistantMockup() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c0d12] overflow-hidden shadow-2xl shadow-black/50">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-white/2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
        </div>
        <span className="ml-2 text-xs text-white/35 font-medium">RAG Assistant</span>
      </div>
      <div className="p-4 space-y-3 min-h-[260px]">
        <div className="flex justify-end">
          <div className="bg-accent/25 border border-accent/30 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-white/90 max-w-[80%]">
            هل يمكن للضيوف الحصول على خدمة غرف في وقت السحور؟
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-white/5 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-white/80 max-w-[88%] space-y-2">
            <p>
              نعم، خدمة غرف السحور متاحة من{" "}
              <span className="text-white font-medium">2:00 صباحاً حتى 4:00 صباحاً</span>
              {" "}للأجنحة والغرف الفاخرة خلال شهر رمضان. القائمة مخصصة للوجبات الخفيفة والمشروبات الساخنة.
            </p>
            <div className="pt-1.5 border-t border-white/8 flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-accent-2" />
              <span className="text-xs text-accent-2">VIP Guest Protocol — Ramadan · 97% match</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="bg-accent/25 border border-accent/30 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-white/90 max-w-[80%]">
            Is there a pet policy for suite guests?
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-white/5 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-white/60 max-w-[88%]">
            I couldn&apos;t find a pet policy in the Knowledge Base. You may want to add that document — I&apos;ll index it immediately.
          </div>
        </div>
      </div>
      <div className="border-t border-white/8 px-4 py-3 flex gap-2 bg-white/2">
        <div className="flex-1 rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-sm text-white/25">
          Ask about policies, menus, procedures…
        </div>
        <button type="button" className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white">Ask</button>
      </div>
    </div>
  );
}

export function AiFeatures() {
  return (
    <section className="landing-section bg-[#0a0b0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20 lg:space-y-28">
        {/* Knowledge Base */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent/70 mb-3">Knowledge Base</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight gradient-text leading-tight">
              Your property&apos;s wiki, powered by AI.
            </h2>
            <p className="mt-4 text-base text-white/55 leading-relaxed">
              Upload any text — policies, menus, SOPs, rate sheets — and the AI indexes it automatically.
              Every document is stored in your private, isolated workspace. No one else&apos;s data. No cross-contamination.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                ["Semantic search", "Find information by meaning, not just keywords"],
                ["Multi-language", "English, Arabic, Russian, Italian in the same KB"],
                ["Instant indexing", "AI embeddings generated in under 30 seconds"],
                ["Full audit trail", "Every upload, edit, and deletion is logged"],
              ].map(([title, desc]) => (
                <li key={title} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-md bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                      <path d="M2 5l2 2 4-4" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white">{title}</span>
                    <span className="text-sm text-white/45"> — {desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <KBMockup />
        </div>

        {/* RAG Assistant */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="order-last lg:order-first">
            <AssistantMockup />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-2/70 mb-3">RAG Assistant</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight gradient-text leading-tight">
              Questions answered from <em className="not-italic gradient-text-accent">your</em> documents.
            </h2>
            <p className="mt-4 text-base text-white/55 leading-relaxed">
              The assistant only answers from what&apos;s in your Knowledge Base.
              If the answer isn&apos;t there, it tells you — so you know what to add.
              No hallucinations. No generic internet answers mixed with your policies.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                ["Source citations", "Every answer shows which document it came from"],
                ["Similarity scoring", "See how confident the AI is (e.g. 97% match)"],
                ["Arabic + English", "Ask in either language, get an answer in either"],
                ["Rate limited", "50 queries/user/hour keeps costs predictable"],
              ].map(([title, desc]) => (
                <li key={title} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-md bg-accent-2/10 border border-accent-2/20 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                      <path d="M2 5l2 2 4-4" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white">{title}</span>
                    <span className="text-sm text-white/45"> — {desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
