import { readFileSync, writeFileSync, existsSync } from "fs";
import { sha256, execVercel, log } from "./utils.js";
import type { EnvVar, LockFile, SyncAction, VarSyncResult, VercelCurrentVar, VercelEnvironment } from "./types.js";

const LOCK_FILE_VERSION = 1;

// ─── Lock file ────────────────────────────────────────────────────────────────

export function readLockFile(lockPath: string): LockFile {
  if (!existsSync(lockPath)) {
    return {
      version: LOCK_FILE_VERSION,
      updatedAt: new Date().toISOString(),
      hashes: { production: {}, preview: {}, development: {} },
    };
  }
  try {
    return JSON.parse(readFileSync(lockPath, "utf8")) as LockFile;
  } catch {
    return {
      version: LOCK_FILE_VERSION,
      updatedAt: new Date().toISOString(),
      hashes: { production: {}, preview: {}, development: {} },
    };
  }
}

export function writeLockFile(lockPath: string, lock: LockFile): void {
  lock.updatedAt = new Date().toISOString();
  writeFileSync(lockPath, JSON.stringify(lock, null, 2), "utf8");
}

// ─── Parse `vercel env ls` output ────────────────────────────────────────────

export function parseVercelEnvLs(output: string): VercelCurrentVar[] {
  const results: VercelCurrentVar[] = [];
  const ENV_MAP: Record<string, VercelEnvironment> = {
    production: "production",
    preview: "preview",
    development: "development",
    dev: "development",
  };

  for (const line of output.split("\n")) {
    // Match lines like: "  VAR_NAME   [hidden]   Production, Preview   2d ago"
    const match = line.match(/^\s+([A-Z][A-Z0-9_]+)\s+\S/);
    if (!match) continue;
    const key = match[1];

    // Extract environments from rest of line
    const rest = line.slice(match[0].length);
    const environments: VercelEnvironment[] = [];
    for (const [label, env] of Object.entries(ENV_MAP)) {
      if (rest.toLowerCase().includes(label)) {
        if (!environments.includes(env)) environments.push(env);
      }
    }

    results.push({ key, environments });
  }

  return results;
}

// ─── Sync one variable to one environment ────────────────────────────────────

function syncVarToEnv(
  key: string,
  value: string,
  env: VercelEnvironment,
  currentKeys: Set<string>,
  exec: ExecFn = execVercel,
): { action: SyncAction; reason?: string } {
  if (currentKeys.has(key)) {
    // Remove existing then re-add with new value
    const rm = exec(["env", "rm", key, env, "--yes"]);
    if (rm.exitCode !== 0 && !rm.stderr.includes("not found")) {
      return { action: "error", reason: `rm failed: ${rm.stderr.trim()}` };
    }
  }

  const add = exec(["env", "add", key, env], value);
  if (add.exitCode !== 0) {
    // Already set with identical value is not an error from our perspective
    if (add.stderr.includes("already exists")) {
      return { action: "skipped", reason: "already exists with same value" };
    }
    return { action: "error", reason: `add failed: ${add.stderr.trim()}` };
  }

  return { action: currentKeys.has(key) ? "updated" : "added" };
}

export type ExecFn = typeof execVercel;

// ─── Main sync ────────────────────────────────────────────────────────────────

export function syncToVercel(
  vars: EnvVar[],
  lockPath: string,
  dryRun = false,
  exec: ExecFn = execVercel,
): VarSyncResult[] {
  const results: VarSyncResult[] = [];
  const lock = readLockFile(lockPath);

  // Fetch current Vercel env state once
  const lsResult = exec(["env", "ls"]);
  const currentVars = lsResult.exitCode === 0 ? parseVercelEnvLs(lsResult.stdout) : [];
  const currentByEnv: Record<VercelEnvironment, Set<string>> = {
    production: new Set(),
    preview: new Set(),
    development: new Set(),
  };
  for (const cv of currentVars) {
    for (const env of cv.environments) {
      currentByEnv[env].add(cv.key);
    }
  }

  for (const envVar of vars) {
    if (envVar.forbidden) {
      for (const env of envVar.environments) {
        results.push({ key: envVar.key, environment: env, action: "forbidden", reason: "scripts-only" });
      }
      continue;
    }

    const newHash = sha256(envVar.value);

    for (const env of envVar.environments) {
      const storedHash = lock.hashes[env][envVar.key];

      if (storedHash === newHash && currentByEnv[env].has(envVar.key)) {
        results.push({ key: envVar.key, environment: env, action: "skipped", reason: "identical" });
        continue;
      }

      if (dryRun) {
        const action = currentByEnv[env].has(envVar.key) ? "updated" : "added";
        results.push({ key: envVar.key, environment: env, action });
        lock.hashes[env][envVar.key] = newHash;
        continue;
      }

      log("info", `Syncing ${envVar.key} → ${env}`);
      const { action, reason } = syncVarToEnv(envVar.key, envVar.value, env, currentByEnv[env], exec);
      results.push({ key: envVar.key, environment: env, action, reason });

      if (action !== "error") {
        lock.hashes[env][envVar.key] = newHash;
      }
    }
  }

  writeLockFile(lockPath, lock);
  return results;
}
