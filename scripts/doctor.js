#!/usr/bin/env node
/**
 * scripts/doctor.js — Eunoia system health check
 *
 * Runs 12 checks and prints a unified pass/warn/fail report.
 *
 * Usage:
 *   npm run doctor                  (loads .env.local)
 *   npm run doctor -- --build       (also verifies production build)
 *   npm run doctor -- --skip-ext    (skip external API pings)
 */

"use strict";

const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const https = require("https");
const http = require("http");
const path = require("path");

// ── env loading ──────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..");
const envPath = path.join(ROOT, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    const raw = t.slice(eq + 1).trim();
    const val = raw.replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
}

// ── flags ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const RUN_BUILD  = args.includes("--build");
const SKIP_EXT   = args.includes("--skip-ext");

// ── colours ───────────────────────────────────────────────────────────────────

const NO_COLOR = process.env.NO_COLOR || !process.stdout.isTTY;
const C = NO_COLOR
  ? { reset: "", bold: "", dim: "", green: "", yellow: "", red: "", cyan: "", grey: "" }
  : {
      reset:  "\x1b[0m",
      bold:   "\x1b[1m",
      dim:    "\x1b[2m",
      green:  "\x1b[32m",
      yellow: "\x1b[33m",
      red:    "\x1b[31m",
      cyan:   "\x1b[36m",
      grey:   "\x1b[90m",
    };

// ── helpers ───────────────────────────────────────────────────────────────────

let passed = 0, warned = 0, failed = 0;
const issues = [];

function ok(label, detail = "") {
  passed++;
  const d = detail ? C.grey + " " + detail + C.reset : "";
  console.log(`  ${C.green}✔${C.reset}  ${label.padEnd(28)}${d}`);
}

function warn(label, detail = "") {
  warned++;
  issues.push({ level: "warn", label, detail });
  const d = detail ? C.grey + " " + detail + C.reset : "";
  console.log(`  ${C.yellow}⚠${C.reset}  ${label.padEnd(28)}${d}`);
}

function fail(label, detail = "") {
  failed++;
  issues.push({ level: "fail", label, detail });
  const d = detail ? C.red + " " + detail + C.reset : "";
  console.log(`  ${C.red}✖${C.reset}  ${label.padEnd(28)}${d}`);
}

function section(title) {
  console.log(`\n${C.bold}${C.cyan}${title}${C.reset}`);
}

function httpGet(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https://") ? https : http;
    const req = mod.get(url, { timeout: timeoutMs }, (res) => {
      let body = "";
      res.on("data", (d) => (body += d));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    req.on("error", reject);
  });
}

// ── banner ────────────────────────────────────────────────────────────────────

console.log(`
${C.bold}╔══════════════════════════════════════════════════╗
║         EUNOIA DOCTOR — SYSTEM CHECK             ║
╚══════════════════════════════════════════════════╝${C.reset}`);

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"));
console.log(`  ${C.grey}Version: ${pkg.version}   Node: ${process.version}   Platform: ${process.platform}${C.reset}`);

// ── check 1: git status ───────────────────────────────────────────────────────

section("1 · Git Status");
try {
  const out = execSync("git status --short", { cwd: ROOT, stdio: ["pipe", "pipe", "pipe"] })
    .toString()
    .trim();
  const lines = out ? out.split("\n") : [];
  const modified  = lines.filter((l) => l.startsWith(" M") || l.startsWith("M ")).length;
  const untracked = lines.filter((l) => l.startsWith("??")).length;
  const added     = lines.filter((l) => l.startsWith("A ")).length;
  if (lines.length === 0) {
    ok("Git status", "clean");
  } else {
    warn("Git status", `${modified} modified · ${untracked} untracked · ${added} staged`);
  }
  const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: ROOT, stdio: "pipe" })
    .toString()
    .trim();
  const commit = execSync("git log -1 --format=%h\\ %s", { cwd: ROOT, stdio: "pipe" })
    .toString()
    .trim();
  console.log(`     ${C.grey}Branch: ${branch}${C.reset}`);
  console.log(`     ${C.grey}Last commit: ${commit}${C.reset}`);
} catch (e) {
  fail("Git status", e.message.slice(0, 80));
}

// ── check 2: typescript ───────────────────────────────────────────────────────

section("2 · TypeScript");
{
  const r = spawnSync("npx", ["tsc", "--noEmit"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });
  const out = (r.stdout + r.stderr).toString();
  const errorCount = (out.match(/error TS/g) || []).length;
  if (r.status === 0) {
    ok("TypeScript", "0 errors");
  } else {
    fail("TypeScript", `${errorCount} error(s)`);
    out.split("\n").filter((l) => l.includes("error TS")).slice(0, 3).forEach((l) => {
      console.log(`     ${C.red}${l.trim().slice(0, 100)}${C.reset}`);
    });
  }
}

// ── check 3: tests ────────────────────────────────────────────────────────────

section("3 · Tests");
{
  const r = spawnSync("npx", ["vitest", "run", "--reporter=verbose"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });
  const out = (r.stdout + r.stderr).toString();
  const passMatch = out.match(/Tests\s+(\d+) passed/);
  const failMatch = out.match(/(\d+) failed/);
  const passCount = passMatch ? parseInt(passMatch[1]) : 0;
  const failCount = failMatch ? parseInt(failMatch[1]) : 0;
  if (r.status === 0 && failCount === 0) {
    ok("Tests", `${passCount} passed`);
  } else {
    fail("Tests", `${passCount} passed · ${failCount} failed`);
  }
}

// ── check 4: lint ─────────────────────────────────────────────────────────────

section("4 · Lint");
{
  const r = spawnSync("npx", ["eslint", "."], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });
  const out = (r.stdout + r.stderr).toString();
  const problems = (out.match(/\d+ problem/)?.[0]) ?? "";
  if (r.status === 0) {
    ok("ESLint", "clean");
  } else {
    fail("ESLint", problems || "errors found");
  }
}

// ── check 5: environment variables ───────────────────────────────────────────

section("5 · Environment Variables");
{
  const required = [
    { key: "NEXT_PUBLIC_SUPABASE_URL",  desc: "Supabase URL" },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", desc: "Supabase anon key" },
    { key: "OPENAI_API_KEY",            desc: "OpenAI key" },
    { key: "NEXT_PUBLIC_APP_URL",       desc: "App URL" },
  ];
  const optional = [
    { key: "RESEND_API_KEY",            desc: "Resend key (invite emails)" },
    { key: "FROM_EMAIL",                desc: "Sender email (invite emails)" },
  ];

  let reqOk = 0;
  for (const { key, desc } of required) {
    if (process.env[key]) {
      reqOk++;
      ok(key, desc);
    } else {
      fail(key, `${desc} — MISSING`);
    }
  }
  for (const { key, desc } of optional) {
    if (process.env[key]) {
      ok(key, desc);
    } else {
      warn(key, `${desc} — not set (optional)`);
    }
  }
}

// ── check 6: supabase ─────────────────────────────────────────────────────────

section("6 · Supabase Connectivity");
if (SKIP_EXT) {
  console.log(`  ${C.grey}(skipped — --skip-ext)${C.reset}`);
} else {
  await (async () => {
    const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      warn("Supabase REST", "env vars missing — skipped");
      return;
    }
    const start = Date.now();
    try {
      const res = await httpGet(
        `${url}/rest/v1/organizations?select=id&limit=0`,
      );
      const ms = Date.now() - start;
      if (res.status === 200) {
        ok("Supabase REST", `${ms}ms`);
      } else {
        fail("Supabase REST", `HTTP ${res.status}`);
      }
    } catch (e) {
      fail("Supabase REST", e.message.slice(0, 60));
    }
  })();
}

// ── check 7: openai ───────────────────────────────────────────────────────────

section("7 · OpenAI Connectivity");
if (SKIP_EXT) {
  console.log(`  ${C.grey}(skipped — --skip-ext)${C.reset}`);
} else {
  await (async () => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      fail("OpenAI embeddings", "OPENAI_API_KEY not set");
      return;
    }
    const start = Date.now();
    try {
      const postData = JSON.stringify({ model: "text-embedding-3-small", input: "ping" });
      const result = await new Promise((resolve, reject) => {
        const req = https.request(
          {
            hostname: "api.openai.com",
            path: "/v1/embeddings",
            method: "POST",
            headers: {
              "Authorization": `Bearer ${key}`,
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(postData),
            },
            timeout: 10000,
          },
          (res) => {
            let body = "";
            res.on("data", (d) => (body += d));
            res.on("end", () => resolve({ status: res.statusCode, body }));
          }
        );
        req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
        req.on("error", reject);
        req.write(postData);
        req.end();
      });
      const ms = Date.now() - start;
      if (result.status === 200) {
        const dims = JSON.parse(result.body).data?.[0]?.embedding?.length ?? 0;
        ok("OpenAI embeddings", `${ms}ms · ${dims} dims`);
      } else {
        const msg = JSON.parse(result.body)?.error?.message ?? `HTTP ${result.status}`;
        fail("OpenAI embeddings", msg.slice(0, 60));
      }
    } catch (e) {
      fail("OpenAI embeddings", e.message.slice(0, 60));
    }
  })();
}

// ── check 8: resend ───────────────────────────────────────────────────────────

section("8 · Resend Connectivity");
if (SKIP_EXT) {
  console.log(`  ${C.grey}(skipped — --skip-ext)${C.reset}`);
} else {
  await (async () => {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      warn("Resend API", "RESEND_API_KEY not set — invite emails disabled");
      return;
    }
    try {
      const result = await new Promise((resolve, reject) => {
        const req = https.request(
          {
            hostname: "api.resend.com",
            path: "/domains",
            method: "GET",
            headers: { "Authorization": `Bearer ${key}` },
            timeout: 5000,
          },
          (res) => {
            let body = "";
            res.on("data", (d) => (body += d));
            res.on("end", () => resolve({ status: res.statusCode, body }));
          }
        );
        req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
        req.on("error", reject);
        req.end();
      });
      if (result.status === 200) {
        const domains = JSON.parse(result.body)?.data ?? [];
        ok("Resend API", `${domains.length} domain(s) configured`);
      } else if (result.status === 401) {
        fail("Resend API", "invalid API key");
      } else {
        warn("Resend API", `HTTP ${result.status}`);
      }
    } catch (e) {
      fail("Resend API", e.message.slice(0, 60));
    }
  })();
}

// ── check 9: health endpoint ─────────────────────────────────────────────────

section("9 · Health Endpoint");
if (SKIP_EXT) {
  console.log(`  ${C.grey}(skipped — --skip-ext)${C.reset}`);
} else {
  await (async () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      warn("Health endpoint", "NEXT_PUBLIC_APP_URL not set");
      return;
    }
    const healthUrl = appUrl.replace(/\/$/, "") + "/api/health";
    const start = Date.now();
    try {
      const res = await httpGet(healthUrl, 6000);
      const ms = Date.now() - start;
      const body = JSON.parse(res.body);
      if (res.status === 200 && body.status === "ok") {
        ok("Health endpoint", `${ms}ms · all checks ok`);
      } else if (res.status === 503) {
        warn("Health endpoint", `degraded — ${JSON.stringify(body.checks)}`);
      } else {
        warn("Health endpoint", `HTTP ${res.status} (server may not be running)`);
      }
    } catch (e) {
      warn("Health endpoint", `unreachable — ${e.message.slice(0, 50)}`);
    }
  })();
}

// ── check 10: rag readiness ──────────────────────────────────────────────────

section("10 · RAG Readiness");
await (async () => {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srvKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !srvKey) {
    warn("KB chunks", "SUPABASE_SERVICE_ROLE_KEY not set — skipped");
    return;
  }
  try {
    const res = await httpGet(
      `${url}/rest/v1/knowledge_base_chunks?select=id&limit=1`,
    );
    if (res.status === 401 || res.status === 403) {
      warn("KB chunks", "auth required — needs SERVICE_ROLE_KEY in headers");
    } else if (res.status === 200) {
      const rows = JSON.parse(res.body);
      if (rows.length > 0) {
        ok("KB chunks", "at least 1 chunk indexed");
      } else {
        warn("KB chunks", "0 chunks — add documents to the Knowledge Base first");
      }
    } else {
      warn("KB chunks", `HTTP ${res.status}`);
    }
  } catch (e) {
    warn("KB chunks", e.message.slice(0, 60));
  }
})();

// ── check 11: build (optional) ───────────────────────────────────────────────

section("11 · Build");
const buildIdPath = path.join(ROOT, ".next", "BUILD_ID");
if (fs.existsSync(buildIdPath)) {
  const buildId = fs.readFileSync(buildIdPath, "utf-8").trim();
  ok(".next/BUILD_ID", buildId.slice(0, 12) + "…");
} else {
  warn(".next/BUILD_ID", "no cached build — run `npm run build`");
}

if (RUN_BUILD) {
  console.log(`  ${C.grey}Running npm run build…${C.reset}`);
  const r = spawnSync("npm", ["run", "build"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });
  const out = (r.stdout + r.stderr).toString();
  const routes = (out.match(/Route \(app\)/)?.[0]) ? (out.match(/\n[├└]/g) || []).length : 0;
  if (r.status === 0) {
    ok("Production build", routes ? `${routes} routes` : "passed");
  } else {
    fail("Production build", "failed — see output above");
    out.split("\n").filter((l) => /error/i.test(l)).slice(0, 5).forEach((l) => {
      console.log(`     ${C.red}${l.trim().slice(0, 100)}${C.reset}`);
    });
  }
}

// ── check 12: production readiness ───────────────────────────────────────────

section("12 · Production Readiness");
{
  const total  = passed + warned + failed;
  const score  = total > 0 ? Math.round((passed / total) * 100) : 0;
  const bar    = "█".repeat(Math.floor(score / 5)) + "░".repeat(20 - Math.floor(score / 5));

  const envReady = !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
                   !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
                   !!process.env.OPENAI_API_KEY;

  if (score === 100 && envReady) {
    ok("Production readiness", `${bar}  ${score}%`);
  } else if (score >= 70 && envReady) {
    warn("Production readiness", `${bar}  ${score}%`);
  } else {
    fail("Production readiness", `${bar}  ${score}% — fix failures above`);
  }
}

// ── summary ───────────────────────────────────────────────────────────────────

const total = passed + warned + failed;
const divider = "─".repeat(50);
console.log(`\n${C.bold}${divider}${C.reset}`);
console.log(
  `  ${C.green}${passed} passed${C.reset}` +
  `  ·  ${C.yellow}${warned} warnings${C.reset}` +
  `  ·  ${C.red}${failed} failed${C.reset}` +
  `  ${C.grey}(${total} checks)${C.reset}`
);
console.log(`${C.bold}${divider}${C.reset}`);

if (issues.length > 0) {
  console.log(`\n${C.bold}Issues:${C.reset}`);
  for (const { level, label, detail } of issues) {
    const icon = level === "fail" ? `${C.red}✖${C.reset}` : `${C.yellow}⚠${C.reset}`;
    console.log(`  ${icon}  ${label}  ${C.grey}${detail}${C.reset}`);
  }
}

console.log("");

if (failed > 0) {
  process.exit(1);
}
