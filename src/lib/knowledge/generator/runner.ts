/**
 * Pipeline Runner — orchestrates batch document generation.
 *
 * Modes:
 *   single     — generate one specific document (industry + department + topic required)
 *   department — generate all topics in one department of one industry
 *   industry   — generate all topics across all departments of one industry
 *   pack       — generate all 453 topics across all enabled industries
 *
 * Rate limiting: waits config.generation.delayBetweenRequestsMs between requests.
 * After every config.generation.batchSize requests, waits an additional second.
 */

import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  PipelineResult,
  RunnerOptions,
  DocumentResult,
  IndustryId,
  DepartmentId,
} from './types';
import { loadConfig, applyOverrides } from './config';
import { buildContext, generateDocument } from './generator';
import { loadEnabledIndustries, loadIndustry } from './industry-loader';
import { loadEnabledDepartments, loadDepartment } from './department-loader';
import { loadTopics } from './topic-loader';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run the knowledge generation pipeline.
 * @param options - Mode and scope parameters
 * @param configPath - Optional path to generator.config.json (defaults to bundled)
 */
export async function runPipeline(options: RunnerOptions, configPath?: string): Promise<PipelineResult> {
  const rawConfig = loadConfig(configPath);
  const config = applyOverrides(rawConfig, {
    dryRun: options.dryRun,
    overwrite: options.overwrite,
    language: options.language,
    country: options.country,
  });

  if (options.provider) {
    config.provider.primary = options.provider;
  }

  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  const credentials = options.credentials ?? {};

  const language = config.generation.defaultLanguage;
  const country = config.generation.defaultCountry;

  console.error(`[runner] runId=${runId} mode=${options.mode} dryRun=${config.generation.dryRun}`);

  const documents: DocumentResult[] = [];
  const errors: string[] = [];

  // Collect all (industry, department, topic) triples for this run
  const combinations = await resolveCombinations(options);

  for (let i = 0; i < combinations.length; i++) {
    const { industryId, departmentId, topicId } = combinations[i];

    if (i > 0) {
      await delay(config.generation.delayBetweenRequestsMs);
    }
    if (i > 0 && i % config.generation.batchSize === 0) {
      await delay(1000);
    }

    try {
      const context = await buildContext(
        industryId,
        departmentId,
        topicId,
        language,
        country,
        config,
        runId
      );
      const result = await generateDocument(context, credentials);
      documents.push(result);

      if (result.status === 'failed' && result.error) {
        errors.push(`${industryId}/${departmentId}/${topicId}: ${result.error}`);
      }

      const pct = Math.round(((i + 1) / combinations.length) * 100);
      console.error(`[runner] ${i + 1}/${combinations.length} (${pct}%) ${result.status} ${topicId}`);
    } catch (err) {
      const message = (err as Error).message;
      errors.push(`${industryId}/${departmentId}/${topicId}: ${message}`);
      documents.push({
        industry: industryId,
        department: departmentId,
        topic: topicId,
        filePath: '',
        documentId: randomUUID(),
        qualityScore: 0,
        status: 'failed',
        error: message,
        durationMs: 0,
      });
    }
  }

  const completedAt = new Date().toISOString();
  const result: PipelineResult = {
    runId,
    startedAt,
    completedAt,
    durationMs: Date.now() - new Date(startedAt).getTime(),
    mode: options.mode,
    scope: {
      industry: options.industry,
      department: options.department,
      topic: options.topic,
      language,
      country,
    },
    provider: config.provider.primary,
    dryRun: config.generation.dryRun,
    summary: {
      total: documents.length,
      succeeded: documents.filter((d) => d.status === 'success').length,
      failed: documents.filter((d) => d.status === 'failed').length,
      quarantined: documents.filter((d) => d.status === 'quarantined').length,
      skipped: documents.filter((d) => d.status === 'skipped').length,
      dryRun: documents.filter((d) => d.status === 'dry-run').length,
    },
    documents,
    errors,
  };

  await writeRunReport(result, config.output.reportPath);
  await appendRunLog(result, config.output.logPath);

  return result;
}

// ─── Combination resolver ─────────────────────────────────────────────────────

interface Combination {
  industryId: IndustryId;
  departmentId: DepartmentId;
  topicId: string;
}

async function resolveCombinations(options: RunnerOptions): Promise<Combination[]> {
  switch (options.mode) {
    case 'single':
      return resolveSingle(options);
    case 'department':
      return resolveDepartment(options);
    case 'industry':
      return resolveIndustry(options);
    case 'pack':
      return resolvePack();
    default: {
      const _exhaustive: never = options.mode;
      throw new Error(`Unknown mode: ${String(_exhaustive)}`);
    }
  }
}

async function resolveSingle(options: RunnerOptions): Promise<Combination[]> {
  if (!options.industry || !options.department || !options.topic) {
    throw new Error('--mode single requires --industry, --department, and --topic');
  }
  return [{ industryId: options.industry, departmentId: options.department, topicId: options.topic }];
}

async function resolveDepartment(options: RunnerOptions): Promise<Combination[]> {
  if (!options.industry || !options.department) {
    throw new Error('--mode department requires --industry and --department');
  }
  const [industry, department] = await Promise.all([
    loadIndustry(options.industry),
    loadDepartment(options.department),
  ]);
  if (!industry.enabled) throw new Error(`Industry "${options.industry}" is not enabled`);
  if (!department.enabled) throw new Error(`Department "${options.department}" is not enabled`);

  const topics = await loadTopics(options.industry, options.department);
  return topics.map((t) => ({
    industryId: options.industry!,
    departmentId: options.department!,
    topicId: t.id,
  }));
}

async function resolveIndustry(options: RunnerOptions): Promise<Combination[]> {
  if (!options.industry) throw new Error('--mode industry requires --industry');
  const industry = await loadIndustry(options.industry);
  if (!industry.enabled) throw new Error(`Industry "${options.industry}" is not enabled`);

  const departments = await loadEnabledDepartments();
  const combos: Combination[] = [];
  for (const dept of departments) {
    const topics = await loadTopics(options.industry, dept.id);
    for (const t of topics) {
      combos.push({ industryId: options.industry, departmentId: dept.id, topicId: t.id });
    }
  }
  return combos;
}

async function resolvePack(): Promise<Combination[]> {
  const industries = await loadEnabledIndustries();
  const departments = await loadEnabledDepartments();
  const combos: Combination[] = [];
  for (const industry of industries) {
    for (const dept of departments) {
      const topics = await loadTopics(industry.id, dept.id);
      for (const t of topics) {
        combos.push({ industryId: industry.id, departmentId: dept.id, topicId: t.id });
      }
    }
  }
  return combos;
}

// ─── Output helpers ───────────────────────────────────────────────────────────

async function writeRunReport(result: PipelineResult, reportPath: string): Promise<void> {
  await mkdir(reportPath, { recursive: true });
  const filename = `run-${result.runId}-${result.startedAt.slice(0, 10)}.json`;
  const filePath = path.join(reportPath, filename);
  await writeFile(filePath, JSON.stringify(result, null, 2), 'utf8');
  console.error(`[runner] Run report: ${filePath}`);
}

async function appendRunLog(result: PipelineResult, logPath: string): Promise<void> {
  await mkdir(path.dirname(logPath), { recursive: true });
  const entry = JSON.stringify({
    runId: result.runId,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    mode: result.mode,
    summary: result.summary,
    dryRun: result.dryRun,
  });
  await appendFile(logPath, `${entry}\n`, 'utf8');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
