#!/usr/bin/env tsx
import { resolve } from "path";
import { existsSync } from "fs";
import { parseExcel } from "./excel.js";
import { buildEnvVars, writeEnvFile } from "./env.js";
import { syncToVercel } from "./vercel.js";
import { writeReport } from "./report.js";
import { runScript, log, header } from "./utils.js";
import type { BootstrapResult } from "./types.js";

const ROOT = resolve(import.meta.dirname, "../..");

const PATHS = {
  excel: resolve(ROOT, "secrets/eunoia-ai-os.xlsx"),
  envMaster: resolve(ROOT, ".env.production.master"),
  lockFile: resolve(ROOT, "tools/bootstrap/.bootstrap.lock.json"),
  report: resolve(ROOT, "tools/bootstrap/BOOTSTRAP_REPORT.md"),
  verifyEnvScript: resolve(ROOT, "scripts/launch/verify_vercel_env.sh"),
  validateWebhookScript: resolve(ROOT, "scripts/launch/validate_webhook.sh"),
  smokeTestScript: resolve(ROOT, "scripts/launch/smoke_test.sh"),
};

const DRY_RUN = process.argv.includes("--dry-run");

async function main(): Promise<void> {
  const startedAt = new Date();
  const errors: string[] = [];

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  Eunoia AI OS — Production Bootstrap System      ║");
  console.log("╚══════════════════════════════════════════════════╝");
  if (DRY_RUN) console.log("\n⚠️  DRY RUN — no changes will be made to Vercel\n");

  // ── Step 1: Read Excel ────────────────────────────────────────────────────
  header("Step 1: Reading Excel source");
  if (!existsSync(PATHS.excel)) {
    console.error(`ERROR: Excel file not found at ${PATHS.excel}`);
    process.exit(1);
  }
  const parsed = parseExcel(PATHS.excel);
  log("success", `Read ${parsed.records.length} raw records from ${PATHS.excel}`);
  for (const w of parsed.warnings) {
    log("warn", w);
    errors.push(w);
  }

  // ── Step 2: Build env vars ────────────────────────────────────────────────
  header("Step 2: Building environment variables");
  const vars = buildEnvVars(parsed);
  const allowed = vars.filter((v) => !v.forbidden);
  const forbidden = vars.filter((v) => v.forbidden);
  const generated = vars.filter((v) => v.generated);
  log("success", `${vars.length} total vars (${allowed.length} uploadable, ${forbidden.length} forbidden, ${generated.length} auto-generated)`);

  // ── Step 3: Write .env.production.master ──────────────────────────────────
  header("Step 3: Writing .env.production.master");
  writeEnvFile(vars, PATHS.envMaster);
  log("success", `Written to ${PATHS.envMaster}`);

  // ── Step 4–10: Sync to Vercel ─────────────────────────────────────────────
  header(`Step 4–10: Syncing to Vercel (Production + Preview + Development)`);
  const syncResults = syncToVercel(vars, PATHS.lockFile, DRY_RUN);

  const added = syncResults.filter((r) => r.action === "added").length;
  const updated = syncResults.filter((r) => r.action === "updated").length;
  const skipped = syncResults.filter((r) => r.action === "skipped").length;
  const errorCount = syncResults.filter((r) => r.action === "error").length;

  log("success", `Added: ${added}  Updated: ${updated}  Skipped: ${skipped}  Errors: ${errorCount}`);

  for (const r of syncResults.filter((x) => x.action === "error")) {
    log("error", `${r.key}/${r.environment}: ${r.reason}`);
    errors.push(`Sync error: ${r.key}/${r.environment} — ${r.reason}`);
  }

  // ── Step 11: verify_vercel_env.sh ─────────────────────────────────────────
  header("Step 11: Running verify_vercel_env.sh");
  const verifyVercelEnv = existsSync(PATHS.verifyEnvScript)
    ? runScript(PATHS.verifyEnvScript)
    : undefined;
  if (verifyVercelEnv) {
    const status = verifyVercelEnv.exitCode === 0 ? "success" : "error";
    log(status, `verify_vercel_env.sh exited ${verifyVercelEnv.exitCode}`);
    if (verifyVercelEnv.exitCode !== 0) errors.push("verify_vercel_env.sh failed");
  } else {
    log("warn", "verify_vercel_env.sh not found — skipped");
  }

  // ── Step 12: validate_webhook.sh ─────────────────────────────────────────
  header("Step 12: Running validate_webhook.sh");
  const validateWebhook = existsSync(PATHS.validateWebhookScript)
    ? runScript(PATHS.validateWebhookScript)
    : undefined;
  if (validateWebhook) {
    const status = validateWebhook.exitCode === 0 ? "success" : "error";
    log(status, `validate_webhook.sh exited ${validateWebhook.exitCode}`);
    if (validateWebhook.exitCode !== 0) errors.push("validate_webhook.sh failed");
  } else {
    log("warn", "validate_webhook.sh not found — skipped");
  }

  // ── Step 13: smoke_test.sh ────────────────────────────────────────────────
  header("Step 13: Running smoke_test.sh");
  const smokeTest = existsSync(PATHS.smokeTestScript)
    ? runScript(PATHS.smokeTestScript)
    : undefined;
  if (smokeTest) {
    const status = smokeTest.exitCode === 0 ? "success" : "error";
    log(status, `smoke_test.sh exited ${smokeTest.exitCode}`);
    if (smokeTest.exitCode !== 0) errors.push("smoke_test.sh failed");
  } else {
    log("warn", "smoke_test.sh not found — skipped");
  }

  // ── Step 14: Report ───────────────────────────────────────────────────────
  header("Step 14: Generating report");
  const result: BootstrapResult = {
    startedAt,
    completedAt: new Date(),
    excelSource: PATHS.excel,
    envFilePath: PATHS.envMaster,
    totalVars: vars.length,
    syncResults,
    scriptResults: { verifyVercelEnv, validateWebhook, smokeTest },
    errors,
  };

  writeReport(result, PATHS.report);
  log("success", `Report written to ${PATHS.report}`);

  // ── Final status ──────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(52));
  if (errors.length === 0) {
    console.log("✅  Bootstrap complete — production is ready.");
  } else {
    console.log(`⚠️  Bootstrap finished with ${errors.length} issue(s) — review report.`);
  }
  console.log("═".repeat(52) + "\n");

  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
