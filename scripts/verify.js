#!/usr/bin/env node
/**
 * scripts/verify.js — Pre-commit verification gate
 *
 * Runs: TypeScript · Lint · Tests
 * Exits 1 if anything fails so CI and the git hook block the commit.
 *
 * Usage:  npm run verify
 */

"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const NO_COLOR = !process.stdout.isTTY;
const C = NO_COLOR
  ? { reset: "", bold: "", green: "", red: "", cyan: "", grey: "" }
  : { reset: "\x1b[0m", bold: "\x1b[1m", green: "\x1b[32m", red: "\x1b[31m", cyan: "\x1b[36m", grey: "\x1b[90m" };

let anyFailed = false;

function run(label, cmd, args) {
  process.stdout.write(`  ${label.padEnd(20)}`);
  const start = Date.now();
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });
  const ms = Date.now() - start;
  if (r.status === 0) {
    console.log(`${C.green}PASS${C.reset}  ${C.grey}${ms}ms${C.reset}`);
  } else {
    console.log(`${C.red}FAIL${C.reset}  ${C.grey}${ms}ms${C.reset}`);
    const out = (r.stdout + r.stderr).toString();
    if (out.trim()) {
      out.split("\n")
        .filter((l) => l.trim())
        .slice(0, 20)
        .forEach((l) => console.log(`  ${C.grey}${l}${C.reset}`));
    }
    anyFailed = true;
  }
}

console.log(`\n${C.bold}${C.cyan}EUNOIA — PRE-COMMIT VERIFICATION${C.reset}\n`);

run("TypeScript", "npx", ["tsc", "--noEmit"]);
run("Lint", "npx", ["eslint", "."]);
run("Tests", "npx", ["vitest", "run"]);

console.log("");

if (anyFailed) {
  console.log(`${C.red}${C.bold}✖ Verification failed — fix errors before committing.${C.reset}\n`);
  process.exit(1);
} else {
  console.log(`${C.green}${C.bold}✔ All checks passed. Safe to commit.${C.reset}\n`);
}
