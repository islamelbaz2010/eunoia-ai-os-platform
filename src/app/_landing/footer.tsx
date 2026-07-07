import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  const links = {
    Product: [
      { label: "Features", href: "#features" },
      { label: "Industries", href: "#industries" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
    Company: [
      { label: "Book a Demo", href: "#demo" },
      { label: "Sign Up", href: "/signup" },
      { label: "Sign In", href: "/login" },
    ],
    Legal: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  };

  return (
    <footer className="border-t border-white/6 bg-[#08090d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-10">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#22d3ee] flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <span className="text-white text-xs font-bold">E</span>
              </div>
              <span className="font-semibold text-sm tracking-tight">Eunoia AI OS</span>
            </Link>
            <p className="text-sm text-white/40 leading-relaxed max-w-xs">
              AI Operating System for Hotels, Resorts, and Hospitality Groups across Egypt, UAE, and Saudi Arabia.
            </p>
            <p className="mt-4 text-xs text-white/25">
              Built for properties that refuse to compromise on service quality.
            </p>
          </div>

          {/* Links */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">{group}</p>
              <ul className="space-y-3">
                {items.map(({ label, href }) => (
                  <li key={label}>
                    {href.startsWith("/") ? (
                      <Link href={href} className="text-sm text-white/50 hover:text-white transition-colors">
                        {label}
                      </Link>
                    ) : (
                      <a href={href} className="text-sm text-white/50 hover:text-white transition-colors">
                        {label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-white/6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/25">
            © {year} Eunoia AI OS. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-white/20">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-2/60 animate-pulse" />
            Production · Vercel · Supabase · OpenAI
          </div>
        </div>
      </div>
    </footer>
  );
}
