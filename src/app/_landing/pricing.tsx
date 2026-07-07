import Link from "next/link";

const tiers = [
  {
    name: "Starter",
    price: "$99",
    period: "/month",
    description: "For a single property team getting started with AI knowledge management.",
    features: [
      "Up to 5 team members",
      "Unlimited AI queries (50/user/hr)",
      "50 Knowledge Base documents",
      "Full CRM with pipeline board",
      "Team invites via email",
      "Audit logs",
      "Email support",
    ],
    cta: "Get started",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$299",
    period: "/month",
    description: "For growing properties with larger teams and heavier knowledge workflows.",
    features: [
      "Up to 25 team members",
      "Unlimited AI queries",
      "500 Knowledge Base documents",
      "Full CRM + activities + tags",
      "CSV import & export",
      "Usage analytics dashboard",
      "Priority email support",
      "Early access to new features",
    ],
    cta: "Start Pro trial",
    href: "/signup?plan=pro",
    highlight: true,
    badge: "Most Popular",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For hotel groups, chains, and multi-property operators with custom requirements.",
    features: [
      "Unlimited team members",
      "Unlimited documents",
      "Multi-property workspaces",
      "SSO / SAML integration",
      "Custom AI model routing",
      "SLA guarantee",
      "Dedicated success manager",
      "Custom integrations",
    ],
    cta: "Talk to us",
    href: "#demo",
    highlight: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="landing-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent/70 mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight gradient-text">
            Simple, transparent pricing.
          </h2>
          <p className="mt-4 text-base text-white/50">
            No per-seat surprise bills. No usage overages. One number, every month.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          {tiers.map(({ name, price, period, description, features, cta, href, highlight, badge }) => (
            <div
              key={name}
              className={`relative rounded-2xl border p-7 flex flex-col transition-all ${
                highlight
                  ? "border-accent/50 bg-gradient-to-b from-accent/10 via-accent/5 to-transparent shadow-2xl shadow-indigo-500/15"
                  : "border-white/8 bg-white/2 hover:border-white/14"
              }`}
            >
              {badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30">
                    {badge}
                  </span>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">{name}</p>
                <div className="flex items-end gap-1 mb-3">
                  <span className="text-4xl font-bold tracking-tight text-white">{price}</span>
                  {period && <span className="text-sm text-white/40 mb-1">{period}</span>}
                </div>
                <p className="text-sm text-white/50 leading-relaxed mb-6">{description}</p>

                <ul className="space-y-2.5 mb-8">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/65">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 shrink-0" aria-hidden="true">
                        <path
                          d="M2 7l3.5 3.5L12 3"
                          stroke={highlight ? "#6366f1" : "#22d3ee"}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto">
                {href.startsWith("/") ? (
                  <Link
                    href={href}
                    className={`block w-full rounded-xl py-3 text-sm font-semibold text-center transition-all ${
                      highlight
                        ? "bg-accent text-white hover:opacity-90 shadow-lg shadow-indigo-500/25"
                        : "border border-white/14 bg-white/5 text-white hover:bg-white/8 hover:border-white/20"
                    }`}
                  >
                    {cta}
                  </Link>
                ) : (
                  <a
                    href={href}
                    className={`block w-full rounded-xl py-3 text-sm font-semibold text-center transition-all ${
                      highlight
                        ? "bg-accent text-white hover:opacity-90 shadow-lg shadow-indigo-500/25"
                        : "border border-white/14 bg-white/5 text-white hover:bg-white/8 hover:border-white/20"
                    }`}
                  >
                    {cta}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-white/35">
          All plans include a 14-day free trial · No credit card required · Cancel anytime
        </p>
      </div>
    </section>
  );
}
