#!/usr/bin/env tsx
/**
 * Knowledge Generation CLI
 *
 * Usage:
 *   npm run knowledge:generate -- --mode single --industry hotels --department faq --topic hotel-faq-basics
 *   npm run knowledge:generate:dry -- --mode pack
 *   npm run knowledge:generate -- --mode industry --industry hotels --provider openai
 *
 * Flags:
 *   --mode       single | department | industry | pack  (required)
 *   --industry   Industry ID (required for single/department/industry modes)
 *   --department Department ID (required for single/department modes)
 *   --topic      Topic ID (required for single mode)
 *   --language   BCP-47 language code (default: config.generation.defaultLanguage)
 *   --country    ISO 3166-1 alpha-2 country code (default: config.generation.defaultCountry)
 *   --provider   openai | claude (overrides config primary provider)
 *   --dry-run    Print what would be generated without calling the LLM
 *   --overwrite  Overwrite existing documents
 */

import { runPipeline } from '../../src/lib/knowledge/generator/runner';
import type { RunMode, IndustryId, DepartmentId, LLMProvider } from '../../src/lib/knowledge/generator/types';

// ─── Arg parser ───────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

function assertMode(value: unknown): RunMode {
  const valid: RunMode[] = ['single', 'department', 'industry', 'pack'];
  if (!valid.includes(value as RunMode)) {
    throw new Error(`--mode must be one of: ${valid.join(', ')}. Got: ${String(value)}`);
  }
  return value as RunMode;
}

function assertProvider(value: unknown): LLMProvider | undefined {
  if (value === undefined || value === true) return undefined;
  const valid: LLMProvider[] = ['openai', 'claude', 'gemini'];
  if (!valid.includes(value as LLMProvider)) {
    throw new Error(`--provider must be one of: ${valid.join(', ')}. Got: ${String(value)}`);
  }
  return value as LLMProvider;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args.mode) {
    console.error('Error: --mode is required');
    console.error('Usage: npm run knowledge:generate -- --mode <single|department|industry|pack> [options]');
    process.exit(1);
  }

  const mode = assertMode(args.mode);
  const provider = assertProvider(args.provider);

  const result = await runPipeline({
    mode,
    industry: args.industry as IndustryId | undefined,
    department: args.department as DepartmentId | undefined,
    topic: args.topic as string | undefined,
    language: args.language as string | undefined,
    country: args.country as string | undefined,
    provider,
    dryRun: args['dry-run'] === true,
    overwrite: args.overwrite === true,
    credentials: {
      openai: process.env.OPENAI_API_KEY,
      claude: process.env.ANTHROPIC_API_KEY,
    },
  });

  // Print summary to stdout
  console.log(JSON.stringify(result.summary, null, 2));

  if (result.errors.length > 0) {
    console.error('\nErrors:');
    result.errors.forEach((e) => console.error(`  - ${e}`));
  }

  const exitCode = result.summary.failed > 0 ? 1 : 0;
  process.exit(exitCode);
}

main().catch((err: unknown) => {
  console.error('[generate] Fatal error:', (err as Error).message);
  process.exit(1);
});
