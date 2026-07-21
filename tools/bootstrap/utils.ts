import { createHash, randomBytes } from "crypto";
import { spawnSync } from "child_process";
import type { ScriptResult } from "./types.js";

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64");
}

export function isEnvVarName(s: string): boolean {
  return /^[A-Z][A-Z0-9_]{1,}$/.test(s.trim());
}

export function parseKeyValueLine(line: string): { key: string; value: string } | null {
  const idx = line.indexOf("=");
  if (idx < 1) return null;
  const key = line.slice(0, idx).trim();
  const value = line.slice(idx + 1).trim();
  if (!isEnvVarName(key)) return null;
  return { key, value };
}

export function log(level: "info" | "warn" | "error" | "success", msg: string): void {
  const prefix = { info: "  →", warn: "  ⚠", error: "  ✗", success: "  ✓" }[level];
  console.log(`${prefix} ${msg}`);
}

export function header(title: string): void {
  console.log(`\n=== ${title} ===\n`);
}

export function execVercel(
  args: string[],
  stdinValue?: string,
): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync("vercel", args, {
    input: stdinValue,
    encoding: "utf8",
    timeout: 30_000,
    env: { ...process.env },
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? 1,
  };
}

export function runScript(scriptPath: string, timeoutMs = 120_000): ScriptResult {
  const start = Date.now();
  const result = spawnSync("bash", [scriptPath], {
    timeout: timeoutMs,
    encoding: "utf8",
    env: { ...process.env },
    cwd: process.cwd(),
  });
  return {
    script: scriptPath,
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    durationMs: Date.now() - start,
  };
}

export function pluralize(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
