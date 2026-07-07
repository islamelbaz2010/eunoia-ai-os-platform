const problems = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Knowledge trapped in people's heads",
    body:
      "Your best GM knows everything — check-in exceptions, group rates, F&B arrangements, VIP protocols. When that person leaves, so does the knowledge. New hires spend 3 months catching up.",
    stat: "3 months",
    statLabel: "average onboarding time for new managers",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "50 questions, 50 different answers",
    body:
      "Ask five team members what your late check-out policy is. You will get five different answers. Guests feel the inconsistency. Reviews suffer. Your brand standard erodes with every shift handover.",
    stat: "47%",
    statLabel: "of guest complaints trace to inconsistent staff information",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "3 hours a day spent on WhatsApp, not guests",
    body:
      "Your department managers spend half their morning answering operational questions over WhatsApp. The same questions, every day, every shift. That time should be spent delivering the guest experience you promise.",
    stat: "3+ hrs",
    statLabel: "daily per manager answering repetitive operational questions",
  },
];

export function Problem() {
  return (
    <section className="landing-section bg-[#0a0b0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent/70 mb-3">The Problem</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight gradient-text leading-tight">
            Your knowledge is your biggest competitive advantage.
            <br />
            <span className="text-white/40">The problem: it&apos;s trapped.</span>
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          {problems.map(({ icon, title, body, stat, statLabel }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/8 bg-white/2 p-6 hover:border-white/14 hover:bg-white/3 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/60 mb-5 group-hover:border-accent/30 group-hover:text-accent transition-all">
                {icon}
              </div>
              <h3 className="text-base font-semibold text-white mb-3">{title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{body}</p>
              <div className="mt-6 pt-5 border-t border-white/6">
                <p className="text-2xl font-bold text-white">{stat}</p>
                <p className="text-xs text-white/40 mt-1">{statLabel}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
