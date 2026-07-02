"use client";

import Link from "next/link";
import { useState, useRef } from "react";

type ParsedRow = {
  full_name: string;
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  linkedin_url?: string;
  notes?: string;
  pipeline_stage?: string;
  status?: string;
};

type ImportResult = {
  inserted: number;
  skipped: number;
  errors: string[];
};

const VALID_STAGES = new Set(["lead","qualified","proposal","negotiation","won","lost"]);
const VALID_STATUSES = new Set(["new","contacted","qualified","won","lost"]);

function parseCSV(text: string): { rows: ParsedRow[]; warnings: string[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { rows: [], warnings: ["CSV has no data rows."] };

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z_]/g, ""));
  const rows: ParsedRow[] = [];
  const warnings: string[] = [];

  for (let i = 1; i < Math.min(lines.length, 501); i++) {
    const values = splitCSVLine(lines[i]);
    if (values.every(v => !v.trim())) continue;

    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = (values[idx] ?? "").trim(); });

    const full_name = obj["full_name"] || obj["name"] || obj["contact_name"] || "";
    if (!full_name) { warnings.push(`Row ${i + 1}: skipped (missing full_name)`); continue; }
    if (full_name.length > 100) { warnings.push(`Row ${i + 1}: name too long, truncated`); }

    const row: ParsedRow = { full_name: full_name.slice(0, 100) };
    if (obj["email"])        row.email        = obj["email"].slice(0, 320);
    if (obj["phone"])        row.phone        = obj["phone"].slice(0, 30);
    if (obj["company"])      row.company      = obj["company"].slice(0, 200);
    if (obj["website"])      row.website      = obj["website"].slice(0, 500);
    if (obj["linkedin_url"]) row.linkedin_url = obj["linkedin_url"].slice(0, 500);
    if (obj["notes"])        row.notes        = obj["notes"].slice(0, 5000);

    const stage = obj["pipeline_stage"] || obj["stage"] || "lead";
    row.pipeline_stage = VALID_STAGES.has(stage) ? stage : "lead";

    const status = obj["status"] || "new";
    row.status = VALID_STATUSES.has(status) ? status : "new";

    rows.push(row);
  }

  if (lines.length > 501) warnings.push("Only the first 500 rows were processed.");
  return { rows, warnings };
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += line[i];
    }
  }
  result.push(current);
  return result;
}

export function CsvImporter({ orgId }: { orgId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsedRow[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setError("Please upload a .csv file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File is too large. Maximum 5 MB.");
      return;
    }
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows, warnings: w } = parseCSV(text);
      setPreview(rows);
      setWarnings(w);
    };
    reader.readAsText(file, "utf-8");
  }

  async function handleImport() {
    if (!preview || preview.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, rows: preview }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Import failed.");
      }
      const data = await res.json() as ImportResult;
      setResult(data);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* File picker */}
      <div className="glass-panel p-6">
        <label className="flex flex-col items-center justify-center gap-3 cursor-pointer rounded-xl border-2 border-dashed border-border/60 p-8 hover:border-accent/40 transition text-center">
          <svg className="h-8 w-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <span className="text-sm text-white/50">Click to upload CSV</span>
          <span className="text-xs text-white/30">or drag and drop · max 5 MB · max 500 rows</span>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="sr-only" />
        </label>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 text-xs text-yellow-300 space-y-1">
          {warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
        </div>
      )}

      {/* Preview */}
      {preview && preview.length > 0 && (
        <div className="space-y-3">
          <div className="glass-panel overflow-hidden">
            <div className="border-b border-border px-5 py-3 flex items-center justify-between">
              <span className="text-xs font-medium">{preview.length} contact{preview.length !== 1 ? "s" : ""} ready to import</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border/60 text-white/30">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Name</th>
                    <th className="px-4 py-2 text-left font-medium">Email</th>
                    <th className="px-4 py-2 text-left font-medium">Company</th>
                    <th className="px-4 py-2 text-left font-medium">Stage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {preview.slice(0, 10).map((row, i) => (
                    <tr key={i} className="hover:bg-white/2">
                      <td className="px-4 py-2">{row.full_name}</td>
                      <td className="px-4 py-2 text-white/50">{row.email ?? "—"}</td>
                      <td className="px-4 py-2 text-white/50">{row.company ?? "—"}</td>
                      <td className="px-4 py-2 capitalize text-white/50">{row.pipeline_stage ?? "lead"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 10 && (
                <p className="px-4 py-2 text-xs text-white/30">… and {preview.length - 10} more rows</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={loading}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Importing…" : `Import ${preview.length} contacts`}
            </button>
            <button
              onClick={() => { setPreview(null); setWarnings([]); if (fileRef.current) fileRef.current.value = ""; }}
              className="rounded-lg border border-border px-5 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-5 space-y-2">
          <p className="text-sm font-medium text-emerald-300">Import complete</p>
          <p className="text-xs text-white/60">{result.inserted} contacts imported successfully.</p>
          {result.skipped > 0 && (
            <p className="text-xs text-white/40">{result.skipped} rows skipped (duplicates or invalid data).</p>
          )}
          {result.errors.length > 0 && (
            <ul className="text-xs text-red-400 space-y-0.5">
              {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          )}
          <Link href="/dashboard/crm" className="inline-block mt-2 text-xs text-accent hover:underline">
            View contacts →
          </Link>
        </div>
      )}
    </div>
  );
}
