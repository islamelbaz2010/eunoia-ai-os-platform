import { describe, it, expect } from "vitest";
import { generateReport, writeReport } from "./report.js";
import { tmpdir } from "os";
import { join } from "path";
import { readFileSync, unlinkSync } from "fs";
import type { BootstrapResult } from "./types.js";

function makeResult(overrides: Partial<BootstrapResult> = {}): BootstrapResult {
  const now = new Date("2026-07-07T12:00:00Z");
  return {
    startedAt: new Date(now.getTime() - 5000),
    completedAt: now,
    excelSource: "/secrets/eunoia-ai-os.xlsx",
    envFilePath: "/.env.production.master",
    totalVars: 20,
    syncResults: [
      { key: "OPENAI_API_KEY", environment: "production", action: "added" },
      { key: "OPENAI_API_KEY", environment: "preview", action: "added" },
      { key: "OPENAI_API_KEY", environment: "development", action: "added" },
      { key: "RESEND_API_KEY", environment: "production", action: "updated" },
      { key: "RESEND_API_KEY", environment: "preview", action: "skipped", reason: "identical" },
      { key: "RESEND_API_KEY", environment: "development", action: "skipped", reason: "identical" },
      { key: "SUPABASE_SERVICE_ROLE_KEY", environment: "production", action: "forbidden" },
      { key: "SUPABASE_SERVICE_ROLE_KEY", environment: "preview", action: "forbidden" },
      { key: "SUPABASE_SERVICE_ROLE_KEY", environment: "development", action: "forbidden" },
    ],
    scriptResults: {
      verifyVercelEnv: { script: "verify_vercel_env.sh", exitCode: 0, stdout: "All good", stderr: "", durationMs: 1200 },
      validateWebhook: { script: "validate_webhook.sh", exitCode: 0, stdout: "OK", stderr: "", durationMs: 800 },
      smokeTest: { script: "smoke_test.sh", exitCode: 1, stdout: "", stderr: "FAIL", durationMs: 3000 },
    },
    errors: ["smoke_test.sh failed"],
    ...overrides,
  };
}

describe("generateReport", () => {
  it("returns a markdown string", () => {
    const md = generateReport(makeResult());
    expect(typeof md).toBe("string");
    expect(md.length).toBeGreaterThan(100);
  });

  it("includes the generated timestamp", () => {
    const md = generateReport(makeResult());
    expect(md).toContain("2026-07-07");
  });

  it("shows added count", () => {
    const md = generateReport(makeResult());
    expect(md).toContain("| 🟢 Added | 3 |");
  });

  it("shows updated count", () => {
    const md = generateReport(makeResult());
    expect(md).toContain("| 🔵 Updated | 1 |");
  });

  it("shows skipped count", () => {
    const md = generateReport(makeResult());
    expect(md).toContain("| ⚪ Skipped (identical) | 2 |");
  });

  it("shows forbidden count", () => {
    const md = generateReport(makeResult());
    expect(md).toContain("| 🔴 Forbidden (never upload) | 3 |");
  });

  it("shows script pass/fail status", () => {
    const md = generateReport(makeResult());
    expect(md).toContain("✅ PASS");
    expect(md).toContain("❌ FAIL");
  });

  it("shows warning status when errors exist", () => {
    const md = generateReport(makeResult());
    expect(md).toContain("Bootstrap finished with issues");
  });

  it("shows success status when no errors and scripts pass", () => {
    const md = generateReport(
      makeResult({
        errors: [],
        scriptResults: {
          verifyVercelEnv: { script: "a", exitCode: 0, stdout: "", stderr: "", durationMs: 100 },
          validateWebhook: { script: "b", exitCode: 0, stdout: "", stderr: "", durationMs: 100 },
          smokeTest: { script: "c", exitCode: 0, stdout: "", stderr: "", durationMs: 100 },
        },
      }),
    );
    expect(md).toContain("Bootstrap complete");
  });

  it("lists variable table with all three environments", () => {
    const md = generateReport(makeResult());
    expect(md).toContain("| Production | Preview | Development |");
    expect(md).toContain("OPENAI_API_KEY");
  });
});

describe("writeReport", () => {
  it("writes markdown file to disk", () => {
    const p = join(tmpdir(), `report-test-${Date.now()}.md`);
    writeReport(makeResult(), p);
    const content = readFileSync(p, "utf8");
    expect(content).toContain("# Bootstrap Report");
    unlinkSync(p);
  });
});
