import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Eunoia AI OS collects, protects, and uses customer data for hospitality knowledge management and CRM workflows.",
};

const sections = [
  {
    title: "Information We Collect",
    body: [
      "Account information such as name, email address, authentication identifiers, organization membership, and role.",
      "Organization data such as company name, team invitations, CRM contacts, knowledge base documents, usage events, and audit logs created inside the platform.",
      "Operational data such as device, browser, IP-derived security signals, request metadata, and error diagnostics needed to keep the service reliable and secure.",
    ],
  },
  {
    title: "How We Use Information",
    body: [
      "To provide the Eunoia AI OS workspace, including authentication, organization management, knowledge search, AI assistant responses, CRM workflows, analytics, and support.",
      "To protect customer accounts through access controls, audit trails, abuse prevention, troubleshooting, and service monitoring.",
      "To improve product quality using aggregated usage patterns and operational metrics. We do not sell customer data.",
    ],
  },
  {
    title: "AI and Knowledge Base Data",
    body: [
      "Customer knowledge base content is used to generate embeddings, retrieve relevant passages, and produce cited AI responses for authorized users in the same organization.",
      "AI answers are grounded in the customer's own uploaded content and source citations where available. Customers are responsible for ensuring uploaded materials are accurate and permitted for internal use.",
      "Eunoia may use subprocessors such as Supabase, OpenAI, Vercel, Sentry, and Resend to operate the service. These providers process data only as needed to deliver platform functionality.",
    ],
  },
  {
    title: "Security and Retention",
    body: [
      "Customer data is protected with organization-scoped access controls, row-level security, role-based permissions, secure cookies, and immutable audit logging.",
      "We retain customer data while an account or organization remains active, and for a reasonable period afterward where required for security, legal, backup, or accounting purposes.",
      "Customers may request export, correction, or deletion of their data, subject to legal, security, and contractual retention requirements.",
    ],
  },
  {
    title: "Contact",
    body: [
      "For privacy requests, data handling questions, or security concerns, contact the Eunoia AI OS team at privacy@eunoiaos.com.",
    ],
  },
];

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/60">
            This policy explains how Eunoia AI OS handles data for hospitality teams using our knowledge base, AI assistant, CRM, and analytics platform.
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
