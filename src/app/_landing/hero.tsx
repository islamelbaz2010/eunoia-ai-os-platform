function ChatMockup() {
  return (
    <div className="relative w-full max-w-[480px] mx-auto lg:mx-0 lg:ml-auto">
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-accent/20 via-transparent to-accent-2/10 blur-2xl" />
      <div className="relative rounded-2xl border border-white/10 bg-[#0c0d12] overflow-hidden shadow-2xl shadow-black/60">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-white/2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
          </div>
          <div className="flex-1 flex justify-center">
            <span className="text-xs text-white/35 font-medium">RAG Assistant — Grand Nile Tower Hotel</span>
          </div>
        </div>

        {/* Messages */}
        <div className="p-4 space-y-3 min-h-[280px]">
          {/* User */}
          <div className="flex justify-end">
            <div className="bg-accent/25 border border-accent/30 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-white/90 max-w-[78%]">
              What time is breakfast served on weekends?
            </div>
          </div>

          {/* Assistant */}
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-white/80 max-w-[88%] space-y-2">
              <p>
                Breakfast is served from{" "}
                <span className="text-white font-medium">6:30 AM to 11:00 AM</span>{" "}
                on Saturdays and Sundays in the Grand Dining Room. The à la carte menu is available until 10:30 AM.
              </p>
              <div className="pt-1.5 border-t border-white/8 flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-accent-2" />
                <span className="text-xs text-accent-2">F&amp;B Operations Guide · 96% match</span>
              </div>
            </div>
          </div>

          {/* User 2 */}
          <div className="flex justify-end">
            <div className="bg-accent/25 border border-accent/30 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-white/90 max-w-[78%]">
              Can VIP guests order Suhoor room service?
            </div>
          </div>

          {/* Typing */}
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/8 rounded-2xl px-4 py-3">
              <div className="flex gap-1 items-center">
                {[0, 150, 300].map((delay) => (
                  <div
                    key={delay}
                    className="w-1.5 h-1.5 rounded-full bg-white/40"
                    style={{ animation: `bounce-dot 1.4s ease ${delay}ms infinite` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-white/8 px-4 py-3 flex gap-2 bg-white/2">
          <div className="flex-1 rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-sm text-white/25">
            Ask about policies, menus, procedures…
          </div>
          <button
            type="button"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center dot-grid overflow-hidden"
    >
      {/* Background glows */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-accent/8 blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-accent-2/6 blur-[100px] translate-x-1/3 -translate-y-1/3 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-2 animate-pulse" />
              <span className="text-xs font-medium text-white/60 tracking-wide uppercase">
                AI Operating System for Hospitality
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-[3.75rem] xl:text-7xl font-bold tracking-tight leading-[1.08]">
              <span className="gradient-text">Your hotel&apos;s brain.</span>
              <br />
              <span className="gradient-text-accent">Powered by AI.</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-white/55 leading-relaxed max-w-xl">
              Upload your policies, menus, and SOPs once. Every team member
              gets the right answer instantly — in Arabic or English — 24/7.
              No guessing. No WhatsApp threads.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-xl shadow-indigo-500/25"
              >
                Start Free Trial
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 px-6 py-3.5 text-sm font-medium text-white/80 hover:bg-white/8 hover:text-white transition-all"
              >
                See how it works
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
              {[
                "Live in 2 hours",
                "No credit card to start",
                "No setup fees",
              ].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-sm text-white/40">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M2 7l3.5 3.5L12 3" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t}
                </span>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-white/6">
              <p className="text-xs text-white/30 uppercase tracking-widest mb-4 font-medium">
                Built for properties across
              </p>
              <div className="flex flex-wrap gap-2">
                {["🇪🇬 Egypt", "🇦🇪 UAE", "🇸🇦 Saudi Arabia"].map((c) => (
                  <span
                    key={c}
                    className="rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-sm text-white/60"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Chat mockup */}
          <ChatMockup />
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#08090d] to-transparent pointer-events-none" />
    </section>
  );
}
