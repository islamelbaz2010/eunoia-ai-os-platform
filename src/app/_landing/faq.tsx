"use client";

import { useState } from "react";

const faqs = [
  {
    q: "How quickly can we go live?",
    a: "Most properties are live within 2 hours. Create an account, name your organization, paste your first document, and start asking questions. No integrations to configure. No API keys to manage. No training data to label.",
  },
  {
    q: "Does the assistant support Arabic?",
    a: "Yes. You can upload documents in Arabic and ask questions in Arabic. The assistant responds in the language of your question. Mixing Arabic and English in the same session works correctly — the AI handles it naturally.",
  },
  {
    q: "Is our data private and secure?",
    a: "Your organization's data is isolated at the database level using row-level security. Our AI never trains on your documents. No other customer can access your Knowledge Base. All data is encrypted in transit and at rest via Supabase's infrastructure.",
  },
  {
    q: "Which AI model powers the assistant?",
    a: "We use GPT-4o-mini via OpenAI for answer generation. The retrieval layer is our own — we embed your documents, store them as vectors, and perform semantic search before calling OpenAI. The AI only sees relevant chunks of your documents, never your entire Knowledge Base.",
  },
  {
    q: "Can we import our existing contact database?",
    a: "Yes — CSV import is built in. Go to CRM → Import, upload your file, and your contacts appear within seconds. We support standard columns (name, email, phone, company, notes) and map custom columns during import.",
  },
  {
    q: "What happens when we reach the query rate limit?",
    a: "Users on the Starter plan are limited to 50 AI queries per hour per user — enough for an active operational shift. If you hit the limit, the assistant shows a clear message and resets after 60 minutes. Pro and Enterprise plans have higher limits. We never silently drop queries.",
  },
  {
    q: "Can team members have different access levels?",
    a: "Yes. Eunoia AI OS has 9 role levels: Owner, Super Admin, Admin, Manager, Operator, Editor, Member, Viewer, and Guest. Owners and Admins can invite, revoke, and manage all team members. Viewers can read but not create or delete.",
  },
  {
    q: "What is the cancellation policy?",
    a: "Cancel anytime from your account settings — no questions asked, no cancellation fees. Your data is available for 30 days after cancellation for export. After that, it is permanently deleted.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/6 last:border-0">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
          {q}
        </span>
        <span
          className={`shrink-0 w-5 h-5 rounded-full border border-white/15 flex items-center justify-center transition-all duration-200 ${
            open ? "border-accent/40 bg-accent/10 rotate-45" : ""
          }`}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M5 1v8M1 5h8" stroke={open ? "#6366f1" : "rgba(255,255,255,0.5)"} strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="pb-5 pr-9">
          <p className="text-sm text-white/50 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export function Faq() {
  return (
    <section id="faq" className="landing-section bg-[#0a0b0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12 lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent/70 mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight gradient-text leading-tight">
              Common questions.
            </h2>
            <p className="mt-4 text-base text-white/50 leading-relaxed">
              Can&apos;t find your answer? Email us at{" "}
              <a href="mailto:hello@eunoiaos.com" className="text-accent hover:underline">
                hello@eunoiaos.com
              </a>
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/2 px-6">
            {faqs.map((item) => (
              <FaqItem key={item.q} {...item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
