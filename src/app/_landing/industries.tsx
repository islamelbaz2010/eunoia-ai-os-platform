const industries = [
  {
    emoji: "🏨",
    title: "Luxury Hotels & Resorts",
    body: "Centralize 5-star service standards, VIP protocols, spa menus, and F&B pricing. Ensure every guest interaction matches your brand promise — from the first call to checkout.",
    useCases: ["Guest welcome standards", "F&B menus and pricing", "VIP and loyalty protocols", "Check-in/check-out policies"],
  },
  {
    emoji: "🏢",
    title: "Hotel Groups & Chains",
    body: "Manage knowledge across multiple properties. Each property gets its own isolated workspace — shared policies at group level, local SOPs at property level.",
    useCases: ["Multi-property management", "Group rate sheets", "Brand standard documentation", "Cross-property consistency"],
  },
  {
    emoji: "🌊",
    title: "Diving Centers & Water Sports",
    body: "Safety-critical environments need accurate, instant answers. Upload PADI/SSI protocols, equipment checklists, and guest safety briefings. One wrong answer costs lives — and lawsuits.",
    useCases: ["Dive safety protocols", "Equipment certification records", "Guest medical screening", "Emergency procedures"],
  },
  {
    emoji: "🎪",
    title: "Events & Corporate Hospitality",
    body: "Manage complex event SOPs, catering configurations, AV setups, and guest logistics. Your event staff gets the right briefing for every event, every time.",
    useCases: ["Event runsheets and timelines", "Catering and AV specifications", "Guest transportation", "Venue configuration guides"],
  },
];

export function Industries() {
  return (
    <section id="industries" className="landing-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent/70 mb-3">Industries</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight gradient-text leading-tight">
            Built for your type of property.
          </h2>
          <p className="mt-4 text-base text-white/50 leading-relaxed">
            Eunoia AI OS is not a generic knowledge base. Every default, every label, every workflow is
            calibrated for hospitality operations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {industries.map(({ emoji, title, body, useCases }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/8 bg-white/2 p-6 hover:border-white/14 hover:bg-white/3 transition-all duration-200"
            >
              <div className="text-3xl mb-4">{emoji}</div>
              <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-white/50 leading-relaxed mb-5">{body}</p>
              <div className="flex flex-wrap gap-2">
                {useCases.map((uc) => (
                  <span
                    key={uc}
                    className="text-xs border border-white/8 bg-white/4 rounded-lg px-2.5 py-1 text-white/50"
                  >
                    {uc}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
