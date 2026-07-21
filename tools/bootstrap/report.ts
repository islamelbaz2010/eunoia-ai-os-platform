import { writeFileSync } from "fs";
import { pluralize } from "./utils.js";
import type { BootstrapResult, SyncAction, VarSyncResult, VercelEnvironment } from "./types.js";

function badge(action: SyncAction): string {
  return {
    added: "🟢 ADDED",
    updated: "🔵 UPDATED",
    skipped: "⚪ SKIPPED",
    forbidden: "🔴 FORBIDDEN",
    error: "❌ ERROR",
  }[action];
}

function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function groupByAction(results: VarSyncResult[]): Record<SyncAction, VarSyncResult[]> {
  const groups: Record<SyncAction, VarSyncResult[]> = {
    added: [],
    updated: [],
    skipped: [],
    forbidden: [],
    error: [],
  };
  for (const r of results) {
    groups[r.action].push(r);
  }
  return groups;
}

function groupByKey(results: VarSyncResult[]): Map<string, VarSyncResult[]> {
  const map = new Map<string, VarSyncResult[]>();
  for (const r of results) {
    if (!map.has(r.key)) map.set(r.key, []);
    map.get(r.key)!.push(r);
  }
  return map;
}

function envTable(results: VarSyncResult[]): string {
  const byKey = groupByKey(results);
  const envs: VercelEnvironment[] = ["production", "preview", "development"];

  const rows = [
    "| Variable | Production | Preview | Development |",
    "|---|---|---|---|",
  ];

  for (const [key, keyResults] of byKey) {
    const cells = envs.map((env) => {
      const r = keyResults.find((x) => x.environment === env);
      if (!r) return "—";
      return badge(r.action);
    });
    rows.push(`| \`${key}\` | ${cells.join(" | ")} |`);
  }

  return rows.join("\n");
}

export function generateReport(result: BootstrapResult): string {
  const { syncResults, scriptResults, errors } = result;
  const groups = groupByAction(syncResults);
  const totalDuration = result.completedAt.getTime() - result.startedAt.getTime();

  const scriptRow = (label: string, r?: BootstrapResult["scriptResults"]["verifyVercelEnv"]) => {
    if (!r) return `| ${label} | — | — |`;
    const status = r.exitCode === 0 ? "✅ PASS" : "❌ FAIL";
    return `| ${label} | ${status} | ${formatDuration(r.durationMs)} |`;
  };

  const lines = [
    `# Bootstrap Report`,
    ``,
    `**Generated**: ${result.completedAt.toISOString()}  `,
    `**Duration**: ${formatDuration(totalDuration)}  `,
    `**Source**: \`${result.excelSource}\`  `,
    `**Output**: \`${result.envFilePath}\`  `,
    `**Variables**: ${pluralize(result.totalVars, "var")} from Excel  `,
    ``,
    `---`,
    ``,
    `## Sync Summary`,
    ``,
    `| Action | Count |`,
    `|---|---|`,
    `| 🟢 Added | ${groups.added.length} |`,
    `| 🔵 Updated | ${groups.updated.length} |`,
    `| ⚪ Skipped (identical) | ${groups.skipped.length} |`,
    `| 🔴 Forbidden (never upload) | ${groups.forbidden.length} |`,
    `| ❌ Errors | ${groups.error.length} |`,
    ``,
    `---`,
    ``,
    `## Variable Detail`,
    ``,
    envTable(syncResults),
    ``,
    `---`,
    ``,
    `## Script Results`,
    ``,
    `| Script | Status | Duration |`,
    `|---|---|---|`,
    scriptRow("verify_vercel_env.sh", scriptResults.verifyVercelEnv),
    scriptRow("validate_webhook.sh", scriptResults.validateWebhook),
    scriptRow("smoke_test.sh", scriptResults.smokeTest),
    ``,
  ];

  if (groups.error.length > 0) {
    lines.push(`---`, ``, `## Sync Errors`, ``);
    for (const r of groups.error) {
      lines.push(`- \`${r.key}\` (${r.environment}): ${r.reason ?? "unknown error"}`);
    }
    lines.push(``);
  }

  if (errors.length > 0) {
    lines.push(`---`, ``, `## Bootstrap Errors`, ``);
    for (const e of errors) {
      lines.push(`- ${e}`);
    }
    lines.push(``);
  }

  const allOk = groups.error.length === 0 && errors.length === 0;
  const scriptsFailed = Object.values(scriptResults).some((s) => s && s.exitCode !== 0);

  lines.push(
    `---`,
    ``,
    `## Status`,
    ``,
    allOk && !scriptsFailed ? `✅ **Bootstrap complete — production is ready.**` : `⚠️ **Bootstrap finished with issues — review errors above.**`,
  );

  return lines.join("\n");
}

export function writeReport(result: BootstrapResult, outputPath: string): void {
  writeFileSync(outputPath, generateReport(result), "utf8");
}
