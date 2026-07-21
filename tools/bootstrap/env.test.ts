import { describe, it, expect } from "vitest";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { buildEnvVars, writeEnvFile } from "./env.js";
import type { ExcelParseResult, EnvVar } from "./types.js";

function makeParseResult(records: { key: string; value: string }[]): ExcelParseResult {
  return {
    records: records.map((r) => ({ ...r, source: "test" })),
    warnings: [],
    source: "test.xlsx",
    readAt: new Date(),
  };
}

describe("buildEnvVars", () => {
  it("returns EnvVar array for valid records", () => {
    const result = buildEnvVars(makeParseResult([{ key: "OPENAI_API_KEY", value: "sk-abc" }]));
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("marks SUPABASE_SERVICE_ROLE_KEY as forbidden", () => {
    const result = buildEnvVars(
      makeParseResult([{ key: "SUPABASE_SERVICE_ROLE_KEY", value: "secret" }]),
    );
    const v = result.find((r) => r.key === "SUPABASE_SERVICE_ROLE_KEY");
    expect(v).toBeDefined();
    expect(v!.forbidden).toBe(true);
  });

  it("auto-expands SUPABASE_URL to NEXT_PUBLIC_SUPABASE_URL", () => {
    const result = buildEnvVars(
      makeParseResult([{ key: "SUPABASE_URL", value: "https://x.supabase.co" }]),
    );
    const pub = result.find((r) => r.key === "NEXT_PUBLIC_SUPABASE_URL");
    expect(pub).toBeDefined();
    expect(pub!.value).toBe("https://x.supabase.co");
  });

  it("auto-expands SUPABASE_ANON_KEY to NEXT_PUBLIC_SUPABASE_ANON_KEY", () => {
    const result = buildEnvVars(
      makeParseResult([{ key: "SUPABASE_ANON_KEY", value: "eyJ..." }]),
    );
    expect(result.find((r) => r.key === "NEXT_PUBLIC_SUPABASE_ANON_KEY")).toBeDefined();
  });

  it("auto-expands SENTRY_DSN to NEXT_PUBLIC_SENTRY_DSN", () => {
    const result = buildEnvVars(
      makeParseResult([{ key: "SENTRY_DSN", value: "https://x@sentry.io/1" }]),
    );
    expect(result.find((r) => r.key === "NEXT_PUBLIC_SENTRY_DSN")).toBeDefined();
  });

  it("generates METRICS_TOKEN when not in records", () => {
    const result = buildEnvVars(makeParseResult([]));
    const token = result.find((r) => r.key === "METRICS_TOKEN");
    expect(token).toBeDefined();
    expect(token!.generated).toBe(true);
    expect(token!.value).toBeTruthy();
  });

  it("replaces trivial METRICS_TOKEN with generated value", () => {
    const result = buildEnvVars(
      makeParseResult([{ key: "METRICS_TOKEN", value: "change-me-in-production" }]),
    );
    const token = result.find((r) => r.key === "METRICS_TOKEN");
    expect(token!.generated).toBe(true);
    expect(token!.value).not.toBe("change-me-in-production");
  });

  it("keeps valid METRICS_TOKEN as-is", () => {
    const result = buildEnvVars(
      makeParseResult([{ key: "METRICS_TOKEN", value: "super-secret-token-12345" }]),
    );
    const token = result.find((r) => r.key === "METRICS_TOKEN");
    expect(token!.value).toBe("super-secret-token-12345");
    expect(token!.generated).toBe(false);
  });

  it("includes NEXT_PUBLIC_APP_URL static var", () => {
    const result = buildEnvVars(makeParseResult([]));
    const url = result.find((r) => r.key === "NEXT_PUBLIC_APP_URL");
    expect(url).toBeDefined();
    expect(url!.value).toContain("vercel.app");
  });

  it("assigns all 3 environments to non-forbidden vars", () => {
    const result = buildEnvVars(makeParseResult([{ key: "OPENAI_API_KEY", value: "sk-x" }]));
    const v = result.find((r) => r.key === "OPENAI_API_KEY");
    expect(v!.environments).toContain("production");
    expect(v!.environments).toContain("preview");
    expect(v!.environments).toContain("development");
  });
});

describe("writeEnvFile", () => {
  it("writes file with correct content", () => {
    const tmp = join(tmpdir(), `bootstrap-test-${Date.now()}.env`);
    const vars: EnvVar[] = [
      { key: "OPENAI_API_KEY", value: "sk-x", environments: ["production"], forbidden: false, generated: false },
      { key: "SUPABASE_SERVICE_ROLE_KEY", value: "secret", environments: ["production"], forbidden: true, generated: false },
    ];

    writeEnvFile(vars, tmp);

    const content = readFileSync(tmp, "utf8");
    expect(content).toContain("OPENAI_API_KEY=sk-x");
    expect(content).toContain("# SUPABASE_SERVICE_ROLE_KEY=secret");
    expect(content).toContain("DO NOT COMMIT");
    unlinkSync(tmp);
  });

  it("marks generated vars with comment", () => {
    const tmp = join(tmpdir(), `bootstrap-test-gen-${Date.now()}.env`);
    writeFileSync(tmp, "");
    const vars: EnvVar[] = [
      { key: "METRICS_TOKEN", value: "abc", environments: ["production"], forbidden: false, generated: true },
    ];
    writeEnvFile(vars, tmp);
    const content = readFileSync(tmp, "utf8");
    expect(content).toContain("auto-generated");
    unlinkSync(tmp);
  });
});
