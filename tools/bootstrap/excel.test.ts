import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { resolve } from "path";
import { parseExcel } from "./excel.js";

const EXCEL_PATH = resolve(import.meta.dirname, "../../secrets/eunoia-ai-os.xlsx");
const hasFile = existsSync(EXCEL_PATH);

describe("parseExcel (module)", () => {
  it("exports a function", () => {
    expect(parseExcel).toBeTypeOf("function");
  });
});

describe("parseExcel (integration)", () => {
  it.skipIf(!hasFile)("returns records from real Excel file", () => {
    const result = parseExcel(EXCEL_PATH);
    expect(result.records.length).toBeGreaterThan(0);
    expect(result.source).toBe(EXCEL_PATH);
    expect(result.readAt).toBeInstanceOf(Date);
  });

  it.skipIf(!hasFile)("extracts OPENAI_API_KEY", () => {
    const result = parseExcel(EXCEL_PATH);
    const found = result.records.find((r) => r.key === "OPENAI_API_KEY");
    expect(found).toBeDefined();
    expect(found!.value).toMatch(/^sk-/);
  });

  it.skipIf(!hasFile)("extracts SUPABASE_URL", () => {
    const result = parseExcel(EXCEL_PATH);
    const found = result.records.find((r) => r.key === "SUPABASE_URL");
    expect(found).toBeDefined();
    expect(found!.value).toMatch(/supabase\.co/);
  });

  it.skipIf(!hasFile)("extracts STRIPE_WEBHOOK_SECRET via alias", () => {
    const result = parseExcel(EXCEL_PATH);
    const found = result.records.find((r) => r.key === "STRIPE_WEBHOOK_SECRET");
    expect(found).toBeDefined();
    expect(found!.value).toMatch(/^whsec_/);
  });

  it.skipIf(!hasFile)("extracts NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY via alias", () => {
    const result = parseExcel(EXCEL_PATH);
    const found = result.records.find((r) => r.key === "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
    expect(found).toBeDefined();
    expect(found!.value).toMatch(/^pk_/);
  });

  it.skipIf(!hasFile)("has no records with empty values", () => {
    const result = parseExcel(EXCEL_PATH);
    const empties = result.records.filter((r) => !r.value);
    expect(empties).toHaveLength(0);
  });

  it.skipIf(!hasFile)("has no duplicate keys", () => {
    const result = parseExcel(EXCEL_PATH);
    const keys = result.records.map((r) => r.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});
