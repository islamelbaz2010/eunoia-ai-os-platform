function CrmMockup() {
  const contacts = [
    { name: "Laila Hassan", company: "Horizon Travel Agency", stage: "Qualified", status: "qualified", value: "EGP 85,000" },
    { name: "Mohammed Al-Rashidi", company: "Gulf Corporate Events", stage: "Proposal Sent", status: "new", value: "EGP 240,000" },
    { name: "Elena Petrov", company: "Nile Luxe Tours", stage: "Won", status: "won", value: "EGP 56,000" },
  ];

  const stageColor: Record<string, string> = {
    qualified: "text-accent bg-accent/10 border-accent/20",
    new: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    won: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c0d12] overflow-hidden shadow-2xl shadow-black/50">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-white/2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
        </div>
        <span className="ml-2 text-xs text-white/35 font-medium">CRM — Contacts</span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 rounded-lg border border-white/8 bg-white/5 px-3 py-1.5 text-xs text-white/30">
            Search contacts…
          </div>
          <button type="button" className="rounded-lg bg-accent/20 border border-accent/30 px-3 py-1.5 text-xs text-accent font-medium whitespace-nowrap">
            + Add contact
          </button>
        </div>
        <div className="space-y-2">
          {contacts.map(({ name, company, stage, status, value }) => (
            <div
              key={name}
              className="rounded-xl border border-white/6 bg-white/3 px-4 py-3 hover:border-white/10 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/30 to-accent-2/20 border border-white/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-white/80">{name[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/85 truncate">{name}</p>
                    <p className="text-xs text-white/35 truncate">{company}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <span className={`text-xs border rounded-lg px-2 py-0.5 font-medium ${stageColor[status]}`}>
                    {stage}
                  </span>
                  <span className="text-xs text-white/40 font-mono">{value}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pipeline mini-bar */}
        <div className="mt-4 pt-4 border-t border-white/6">
          <p className="text-xs text-white/35 mb-2">Pipeline</p>
          <div className="flex gap-1 h-2 rounded-full overflow-hidden">
            <div className="bg-accent/60" style={{ width: "20%" }} />
            <div className="bg-accent/40" style={{ width: "30%" }} />
            <div className="bg-accent-2/50" style={{ width: "25%" }} />
            <div className="bg-emerald-500/50" style={{ width: "25%" }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-white/25">Lead</span>
            <span className="text-xs text-white/25">Qualified</span>
            <span className="text-xs text-white/25">Proposal</span>
            <span className="text-xs text-white/25">Won</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const crmFeatures = [
  {
    title: "Visual pipeline board",
    body: "Drag contacts from Lead to Qualified to Won. See your entire sales funnel at a glance — conversion rates included.",
  },
  {
    title: "Contact timeline",
    body: "Log calls, meetings, emails, and notes against every contact. Your team sees the full history — no more asking 'who spoke to them last?'",
  },
  {
    title: "CSV import",
    body: "Import hundreds of travel agents, corporate accounts, and VIP guests in seconds. Your existing data, immediately searchable.",
  },
  {
    title: "Activity management",
    body: "Assign tasks and follow-ups to team members. Never miss a callback. Never lose a deal because someone forgot to follow up.",
  },
];

export function CrmSection() {
  return (
    <section className="landing-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent/70 mb-3">CRM</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight gradient-text leading-tight">
              Every guest relationship, fully tracked.
            </h2>
            <p className="mt-4 text-base text-white/55 leading-relaxed">
              A CRM built for hospitality sales — not generic B2B software retrofitted with a hotel skin.
              Track travel agents, corporate accounts, event organizers, and VIP guests in one place.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {crmFeatures.map(({ title, body }) => (
                <div key={title} className="rounded-xl border border-white/8 bg-white/2 p-4">
                  <h3 className="text-sm font-semibold text-white mb-1.5">{title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
          <CrmMockup />
        </div>
      </div>
    </section>
  );
}
