import { describe, it, expect } from "vitest";
import { readLockFile, writeLockFile, parseVercelEnvLs, syncToVercel } from "./vercel.js";
import { sha256 } from "./utils.js";
import type { ExecFn } from "./vercel.js";
import { tmpdir } from "os";
import { join } from "path";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import type { EnvVar, LockFile } from "./types.js";

function tempPath(name: string): string {
  return join(tmpdir(), `bootstrap-vercel-test-${name}-${Date.now()}.json`);
}

function makeVar(key: string, value: string, forbidden = false): EnvVar {
  return {
    key,
    value,
    environments: ["production", "preview", "development"],
    forbidden,
    generated: false,
  };
}

describe("readLockFile", () => {
  it("returns empty lock when file does not exist", () => {
    const lock = readLockFile("/nonexistent/path.json");
    expect(lock.version).toBe(1);
    expect(lock.hashes.production).toEqual({});
    expect(lock.hashes.preview).toEqual({});
    expect(lock.hashes.development).toEqual({});
  });

  it("parses existing lock file", () => {
    const p = tempPath("read");
    const data: LockFile = {
      version: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      hashes: { production: { FOO: "abc" }, preview: {}, development: {} },
    };
    writeFileSync(p, JSON.stringify(data));
    const lock = readLockFile(p);
    expect(lock.hashes.production.FOO).toBe("abc");
    unlinkSync(p);
  });

  it("returns empty lock for corrupt file", () => {
    const p = tempPath("corrupt");
    writeFileSync(p, "{ not valid json }}}");
    const lock = readLockFile(p);
    expect(lock.hashes.production).toEqual({});
    unlinkSync(p);
  });
});

describe("writeLockFile", () => {
  it("writes and can be re-read", () => {
    const p = tempPath("write");
    const lock: LockFile = {
      version: 1,
      updatedAt: "",
      hashes: { production: { MY_VAR: "hash123" }, preview: {}, development: {} },
    };
    writeLockFile(p, lock);
    const re = readLockFile(p);
    expect(re.hashes.production.MY_VAR).toBe("hash123");
    expect(re.updatedAt).toBeTruthy();
    unlinkSync(p);
  });
});

describe("parseVercelEnvLs", () => {
  const SAMPLE_OUTPUT = `
Vercel CLI 54.21.1
> Environment Variables found in Project eunoia-ai-os-platform [230ms]

  Name                         Value       Environments                              Created
  OPENAI_API_KEY               [hidden]    Production, Preview, Development           2d ago
  NEXT_PUBLIC_SUPABASE_URL     [hidden]    Production, Preview                        1d ago
  METRICS_TOKEN                [hidden]    Production                                 5h ago
`;

  it("parses variable names", () => {
    const vars = parseVercelEnvLs(SAMPLE_OUTPUT);
    const keys = vars.map((v) => v.key);
    expect(keys).toContain("OPENAI_API_KEY");
    expect(keys).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(keys).toContain("METRICS_TOKEN");
  });

  it("parses environments for multi-env var", () => {
    const vars = parseVercelEnvLs(SAMPLE_OUTPUT);
    const openai = vars.find((v) => v.key === "OPENAI_API_KEY");
    expect(openai?.environments).toContain("production");
    expect(openai?.environments).toContain("preview");
    expect(openai?.environments).toContain("development");
  });

  it("parses single-environment var", () => {
    const vars = parseVercelEnvLs(SAMPLE_OUTPUT);
    const metrics = vars.find((v) => v.key === "METRICS_TOKEN");
    expect(metrics?.environments).toContain("production");
    expect(metrics?.environments).not.toContain("preview");
  });

  it("returns empty array for empty output", () => {
    expect(parseVercelEnvLs("")).toHaveLength(0);
    expect(parseVercelEnvLs("No variables found")).toHaveLength(0);
  });
});

describe("syncToVercel (dry-run with mock exec)", () => {
  // Mock exec returns empty ls output → no current vars in Vercel
  const mockExec: ExecFn = (_args, _stdin) => ({ stdout: "", stderr: "", exitCode: 0 });

  it("marks forbidden vars with forbidden action for all environments", () => {
    const p = tempPath("dryforbidden");
    const results = syncToVercel(
      [makeVar("SUPABASE_SERVICE_ROLE_KEY", "secret", true)],
      p,
      true,
      mockExec,
    );
    const forbidden = results.filter((r) => r.action === "forbidden");
    expect(forbidden).toHaveLength(3);
    if (existsSync(p)) unlinkSync(p);
  });

  it("marks vars as added when not in lock", () => {
    const p = tempPath("dryadd");
    const results = syncToVercel([makeVar("NEW_VAR", "abc123")], p, true, mockExec);
    const added = results.filter((r) => r.action === "added");
    expect(added).toHaveLength(3); // production + preview + development
    if (existsSync(p)) unlinkSync(p);
  });

  it("marks vars as skipped when hash matches existing lock and var is in Vercel", () => {
    const p = tempPath("dryskip");
    const value = "my-secret-value";
    const hash = sha256(value);
    const lock: LockFile = {
      version: 1,
      updatedAt: new Date().toISOString(),
      hashes: {
        production: { STABLE_VAR: hash },
        preview: { STABLE_VAR: hash },
        development: { STABLE_VAR: hash },
      },
    };
    writeFileSync(p, JSON.stringify(lock));

    // Mock exec returns ls output showing STABLE_VAR already in all envs
    const lsOutput = `
  Name        Value     Environments
  STABLE_VAR  [hidden]  Production, Preview, Development  1d ago
`;
    const execWithVar: ExecFn = (args, _stdin) =>
      args[1] === "ls"
        ? { stdout: lsOutput, stderr: "", exitCode: 0 }
        : { stdout: "", stderr: "", exitCode: 0 };

    const results = syncToVercel([makeVar("STABLE_VAR", value)], p, true, execWithVar);
    const skipped = results.filter((r) => r.action === "skipped");
    expect(skipped).toHaveLength(3);
    if (existsSync(p)) unlinkSync(p);
  });

  it("updates lock file after dry-run", () => {
    const p = tempPath("drylock");
    syncToVercel([makeVar("FOO_KEY", "bar-value")], p, true, mockExec);
    const lock = readLockFile(p);
    expect(lock.hashes.production.FOO_KEY).toBeTruthy();
    expect(lock.hashes.preview.FOO_KEY).toBeTruthy();
    expect(lock.hashes.development.FOO_KEY).toBeTruthy();
    if (existsSync(p)) unlinkSync(p);
  });

  it("does not write lock entry for forbidden vars", () => {
    const p = tempPath("dryforbiddenlock");
    syncToVercel([makeVar("SUPABASE_SERVICE_ROLE_KEY", "secret", true)], p, true, mockExec);
    const lock = readLockFile(p);
    expect(lock.hashes.production.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    if (existsSync(p)) unlinkSync(p);
  });
});
