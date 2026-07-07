import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing access to and use of the Eunoia AI OS hospitality AI knowledge and CRM platform.",
};

const sections = [
  {
    title: "Use of the Service",
    body: [
      "Eunoia AI OS provides hosted software for hospitality teams to manage knowledge, ask AI-assisted questions, operate CRM workflows, invite team members, and review analytics.",
      "You are responsible for keeping account credentials secure, assigning appropriate roles to team members, and ensuring that all users comply with these terms.",
      "You may not use the service to upload unlawful content, violate third-party rights, reverse engineer the platform, bypass usage limits, or interfere with service reliability.",
    ],
  },
  {
    title: "Customer Content",
    body: [
      "You retain ownership of documents, CRM records, organization settings, and other content uploaded or created in your workspace.",
      "You grant Eunoia AI OS the limited rights needed to host, process, index, retrieve, and display customer content so the platform can provide its contracted functionality.",
      "You are responsible for the accuracy, legality, and permissions associated with customer content, including personal data contained in CRM records or knowledge documents.",
    ],
  },
  {
    title: "AI Outputs",
    body: [
      "The AI assistant generates responses from retrieved knowledge base content and may still produce incomplete, inaccurate, or unsuitable output.",
      "AI outputs should be reviewed by qualified staff before being used for guest communications, operational decisions, safety procedures, pricing, legal, medical, or compliance-sensitive matters.",
      "Source citations are provided to support verification, but they do not replace human judgment or operational approval.",
    ],
  },
  {
    title: "Subscriptions and Availability",
    body: [
      "Paid subscription terms, pricing, usage limits, billing cadence, taxes, renewals, and cancellation rights will be shown at checkout or in an applicable order form.",
      "We aim to keep the service reliable, but access may be interrupted for maintenance, provider outages, security events, or circumstances outside our reasonable control.",
      "We may update the platform, add or remove features, or change these terms as the product evolves. Material changes will be communicated through reasonable notice.",
    ],
  },
  {
    title: "Contact",
    body: [
      "For contract, billing, or terms questions, contact the Eunoia AI OS team at legal@eunoiaos.com.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#08090d]">
      <div className="mx-auto flex w-full max-w-4xl flex-col px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-10 inline-flex w-fit items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
        >
          <span aria-hidden="true">←</span>
          Back to Eunoia AI OS
        </Link>

        <header className="border-b border-white/8 pb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-2">
            Legal
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">
            These terms govern access to Eunoia AI OS, the hospitality AI knowledge base, assistant, CRM, analytics, and team workspace platform.
          </p>
          <p className="mt-4 text-xs text-white/40">Last updated: July 7, 2026</p>
        </header>

        <div className="divide-y divide-white/8">
          {sections.map((section) => (
            <section key={section.title} className="py-8">
              <h2 className="text-xl font-semibold text-white">{section.title}</h2>
              <div className="mt-4 space-y-4">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-6 text-white/62">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
