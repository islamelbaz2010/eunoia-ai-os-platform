#!/usr/bin/env node
// verify-migrations.js
// Run AFTER applying migrations to confirm all RPCs, tables, and schema changes are live.
// Usage: node scripts/verify-migrations.js
// Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

"use strict";

const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    const env = {};
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    }
    return env;
  } catch {
    return {};
  }
}

const env = { ...process.env, ...loadEnv() };
const SUPA_URL = (env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const ANON = (env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
const SERVICE = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!SUPA_URL || !ANON) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY required.");
  process.exit(1);
}

const authKey = SERVICE || ANON;
const authHeaders = {
  apikey: authKey,
  Authorization: `Bearer ${authKey}`,
  "Content-Type": "application/json",
};

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    const result = await fn();
    if (result.ok) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.log(`  ❌ ${name}: ${result.reason}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

async function rpc(fn, body = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function tableAccessible(table) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}?limit=1`, { headers: authHeaders });
  return res.status !== 404;
}

(async () => {
  console.log("\nEunoia Migration Verification");
  console.log("==============================");
  console.log(`Project: ${SUPA_URL}`);
  console.log(`Auth: ${SERVICE ? "service_role (bypass RLS)" : "anon (RLS enforced)"}\n`);

  // 0005: create_organization
  console.log("Migration 0005 — create_organization");
  await check("create_organization RPC exists", async () => {
    const r = await rpc("create_organization", { org_name: "__verify__", org_slug: "a" });
    if (r.status === 404 && r.body && r.body.code === "PGRST202") {
      return { ok: false, reason: "Function not found (PGRST202) — 0005 not applied" };
    }
    return { ok: true };
  });

  // 0007: get_usage_totals
  console.log("\nMigration 0007 — get_usage_totals");
  await check("get_usage_totals RPC exists", async () => {
    const r = await rpc("get_usage_totals", { org_id: "00000000-0000-0000-0000-000000000000" });
    if (r.status === 404 && r.body && r.body.code === "PGRST202") {
      return { ok: false, reason: "Function not found (PGRST202) — 0007 not applied" };
    }
    return { ok: true };
  });

  // 0008: healthcheck
  console.log("\nMigration 0008 — healthcheck");
  await check("healthcheck() callable by anon", async () => {
    const res = await fetch(`${SUPA_URL}/rest/v1/rpc/healthcheck`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
      body: "{}",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}: ${JSON.stringify(body)}` };
    if (body.ok !== true) return { ok: false, reason: `Unexpected: ${JSON.stringify(body)}` };
    return { ok: true };
  });
  await check("healthcheck() returns server_time and database", async () => {
    const res = await fetch(`${SUPA_URL}/rest/v1/rpc/healthcheck`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
      body: "{}",
    });
    const body = await res.json().catch(() => ({}));
    if (!body.server_time || !body.database) {
      return { ok: false, reason: `Missing fields: ${JSON.stringify(body)}` };
    }
    return { ok: true };
  });

  // 0009: enterprise schema
  console.log("\nMigration 0009 — enterprise schema");
  await check("member_permissions table exists", async () => {
    const ok = await tableAccessible("member_permissions");
    return ok ? { ok: true } : { ok: false, reason: "Table not found — 0009 not applied" };
  });
  await check("permissions table exists", async () => {
    const ok = await tableAccessible("permissions");
    return ok ? { ok: true } : { ok: false, reason: "Table not found — 0009 not applied" };
  });
  await check("organizations.status column exists", async () => {
    const res = await fetch(`${SUPA_URL}/rest/v1/organizations?select=status&limit=1`, {
      headers: authHeaders,
    });
    if (res.status === 400) {
      const body = await res.json().catch(() => ({}));
      if ((body.message || "").includes("status")) {
        return { ok: false, reason: "Column not found — 0009 not applied" };
      }
    }
    return { ok: true };
  });
  await check("resend_org_invite RPC exists", async () => {
    const r = await rpc("resend_org_invite", { invite_id: "00000000-0000-0000-0000-000000000000" });
    if (r.status === 404 && r.body && r.body.code === "PGRST202") {
      return { ok: false, reason: "Function not found (PGRST202) — 0009 not applied" };
    }
    return { ok: true };
  });

  // 0003-0004: grants
  console.log("\nMigrations 0003–0004 — grants and indexes");
  await check("knowledge_base_chunks accessible to service_role", async () => {
    const res = await fetch(`${SUPA_URL}/rest/v1/knowledge_base_chunks?limit=1`, {
      headers: authHeaders,
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, reason: `Permission denied (HTTP ${res.status}) — 0003 grants missing` };
    }
    return { ok: true };
  });
  await check("audit_logs accessible to service_role", async () => {
    const res = await fetch(`${SUPA_URL}/rest/v1/audit_logs?limit=1`, { headers: authHeaders });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, reason: `Permission denied (HTTP ${res.status}) — 0003 grants missing` };
    }
    return { ok: true };
  });

  // Production
  const APP_URL = (env.NEXT_PUBLIC_APP_URL || "https://eunoia-ai-os-platform.vercel.app").trim();
  console.log(`\nProduction Health (${APP_URL})`);
  await check("/api/live returns ok", async () => {
    const res = await fetch(`${APP_URL}/api/live`);
    const body = await res.json().catch(() => ({}));
    if (body.status !== "ok") return { ok: false, reason: `Got: ${JSON.stringify(body)}` };
    return { ok: true };
  });
  await check("/api/health returns ready", async () => {
    const res = await fetch(`${APP_URL}/api/health`);
    const body = await res.json().catch(() => ({}));
    if (body.status !== "ready") return { ok: false, reason: `Got: ${JSON.stringify(body)}` };
    return { ok: true };
  });
  await check("/api/metrics requires Bearer token", async () => {
    const res = await fetch(`${APP_URL}/api/metrics`);
    if (res.status !== 401) {
      return { ok: false, reason: `Expected 401, got ${res.status} — METRICS_TOKEN may not be set` };
    }
    return { ok: true };
  });

  console.log("\n==============================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log("✅ All migrations verified. RC1 is GO.\n");
  } else {
    console.log(`❌ ${failed} check(s) failed. Apply missing migrations and re-run.\n`);
    process.exit(1);
  }
})();
