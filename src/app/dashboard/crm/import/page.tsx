import Link from "next/link";
import { getActiveOrganization, verifySession } from "@/lib/auth/dal";
import { hasRole } from "@/lib/types";
import { CsvImporter } from "./csv-importer";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Import Contacts — Eunoia AI OS" };

export default async function ImportPage() {
  await verifySession();
  const membership = await getActiveOrganization();

  if (!membership || !hasRole(membership.role, "member")) {
    return <div className="py-12 text-center text-white/40">Access denied.</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Import Contacts</h1>
          <p className="mt-0.5 text-sm text-white/50">Upload a CSV file to bulk import contacts.</p>
        </div>
        <Link href="/dashboard/crm" className="text-xs text-white/40 hover:text-white transition border border-border rounded-lg px-3 py-1.5">
          ← CRM
        </Link>
      </div>

      <div className="glass-panel p-5 text-xs text-white/50 space-y-2">
        <p className="font-medium text-white/70">CSV format</p>
        <p>Required columns: <code className="text-accent">full_name</code></p>
        <p>Optional columns: <code className="text-white/50">email, phone, company, website, linkedin_url, notes, pipeline_stage, status</code></p>
        <p>Valid pipeline stages: lead, qualified, proposal, negotiation, won, lost</p>
        <p>Max 500 rows per import.</p>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent("full_name,email,phone,company,website,notes,pipeline_stage\nJohn Smith,john@example.com,+1234567890,ACME Corp,https://acme.com,,lead\n")}`}
          download="contacts-template.csv"
          className="text-accent hover:underline"
        >
          Download template
        </a>
      </div>

      <CsvImporter orgId={membership.organization.id} />
    </div>
  );
}
