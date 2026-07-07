const stats = [
  {
    value: "3hrs",
    label: "Saved daily",
    detail: "Per manager, on repetitive operational questions currently handled over WhatsApp",
  },
  {
    value: "< 2hrs",
    label: "Time to go live",
    detail: "From account creation to first AI-answered query — no integrations, no configuration",
  },
  {
    value: "50+",
    label: "Queries per hour",
    detail: "AI answers per user per hour, each cited to the exact source document",
  },
  {
    value: "100%",
    label: "Cited answers",
    detail: "Every response links to the source document and shows the similarity score",
  },
];

export function Roi() {
  return (
    <section className="landing-section bg-[#0a0b0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent/70 mb-3">Return on Investment</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight gradient-text">
            Numbers that speak for themselves.
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map(({ value, label, detail }) => (
            <div
              key={value}
              className="relative rounded-2xl border border-white/8 bg-white/2 p-6 text-center overflow-hidden hover:border-white/14 transition-colors group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <p className="text-4xl sm:text-5xl font-bold gradient-text-accent tracking-tight">{value}</p>
              <p className="mt-2 text-sm font-semibold text-white">{label}</p>
              <p className="mt-2 text-xs text-white/40 leading-relaxed">{detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-white/8 bg-white/2 p-8 text-center">
          <p className="text-lg sm:text-xl font-semibold text-white max-w-2xl mx-auto leading-relaxed">
            &ldquo;If a manager spends 3 hours a day on WhatsApp answering staff questions, and your Starter plan costs $99/month,
            the ROI pays for itself in under{" "}
            <span className="gradient-text-accent font-bold">4 hours of work.</span>&rdquo;
          </p>
          <p className="mt-3 text-sm text-white/35">Based on an average manager hourly cost of $25 in MENA hospitality markets</p>
        </div>
      </div>
    </section>
  );
}
