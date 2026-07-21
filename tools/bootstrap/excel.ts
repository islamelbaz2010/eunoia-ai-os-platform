import * as xlsx from "xlsx";
import { isEnvVarName, parseKeyValueLine } from "./utils.js";
import type { ExcelParseResult, RawEnvRecord } from "./types.js";

// Map human-readable row labels to env var names (Stripe Dashboard keys section)
const SITE_ALIASES: Record<string, string> = {
  "publishable key": "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "secret key": "STRIPE_SECRET_KEY",
  "signing secret": "STRIPE_WEBHOOK_SECRET",
  "whatsapp meta_access_token": "META_ACCESS_TOKEN",
  "whatsapp meta_phone_number_id": "META_PHONE_NUMBER_ID",
  "whatsapp meta_business_account_id": "META_BUSINESS_ACCOUNT_ID",
};

type SheetRow = Record<string, string>;

function normalizeAlias(site: string): string {
  return site.trim().toLowerCase();
}

/**
 * Primary pass: rows where `site` is a valid env var name.
 */
function extractFromSiteColumn(rows: SheetRow[]): RawEnvRecord[] {
  const records: RawEnvRecord[] = [];
  rows.forEach((row, i) => {
    const key = String(row["site"] ?? "").trim();
    const value = String(row["stutus"] ?? "").trim();
    if (isEnvVarName(key) && value) {
      records.push({ key, value, source: `row:${i + 2}:site` });
    }
  });
  return records;
}

/**
 * Alias pass: rows where `site` matches a known human-readable label.
 */
function extractFromAliases(rows: SheetRow[]): RawEnvRecord[] {
  const records: RawEnvRecord[] = [];
  rows.forEach((row, i) => {
    const site = normalizeAlias(String(row["site"] ?? ""));
    const value = String(row["stutus"] ?? "").trim();
    const key = SITE_ALIASES[site];
    if (key && value) {
      records.push({ key, value, source: `row:${i + 2}:alias` });
    }
  });
  return records;
}

/**
 * Column pass: some rows store KEY=VALUE strings in non-standard columns.
 * The spreadsheet uses a column named 'SUPABASE_ANON_KEY=' for extra inline vars.
 */
function extractFromInlineColumns(rows: SheetRow[]): RawEnvRecord[] {
  const records: RawEnvRecord[] = [];
  const inlineColumnKey = "SUPABASE_ANON_KEY=";
  rows.forEach((row, i) => {
    const cell = String(row[inlineColumnKey] ?? "").trim();
    if (!cell) return;
    const parsed = parseKeyValueLine(cell);
    if (parsed && parsed.value) {
      records.push({ key: parsed.key, value: parsed.value, source: `row:${i + 2}:inline` });
    }
  });
  return records;
}

/**
 * Merge record sets: later entries win for the same key.
 */
function mergeRecords(passes: RawEnvRecord[][]): RawEnvRecord[] {
  const map = new Map<string, RawEnvRecord>();
  for (const records of passes) {
    for (const r of records) {
      map.set(r.key, r);
    }
  }
  return Array.from(map.values());
}

export function parseExcel(filePath: string): ExcelParseResult {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { records: [], warnings: ["No sheets found in workbook"], source: filePath, readAt: new Date() };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows: SheetRow[] = xlsx.utils.sheet_to_json<SheetRow>(sheet, { defval: "", raw: false });

  const pass1 = extractFromSiteColumn(rows);
  const pass2 = extractFromAliases(rows);
  const pass3 = extractFromInlineColumns(rows);

  // Priority: inline columns override aliases override site column
  const merged = mergeRecords([pass1, pass3, pass2]);

  const warnings: string[] = [];
  if (merged.length === 0) {
    warnings.push("No env vars extracted from Excel — check sheet structure");
  }

  return { records: merged, warnings, source: filePath, readAt: new Date() };
}
