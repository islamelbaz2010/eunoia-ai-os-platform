/**
 * Single-Document Generator — the core of the Knowledge Generation Pipeline.
 *
 * For each (industry, department, topic, language, country) combination:
 *   1. Build the generation context
 *   2. Build the LLM prompt
 *   3. Call the LLM (with provider fallback)
 *   4. Parse raw JSON output
 *   5. Validate against the canonical schema
 *   6. Retry with a repair prompt if validation fails (up to config.provider.retries)
 *   7. Compute quality score
 *   8. Write to disk (or quarantine if score is too low)
 *   9. Return a DocumentResult
 */

import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  GenerationContext,
  GeneratorConfig,
  DocumentResult,
  GeneratedDocument,
  ProviderCredentials,
  IndustryId,
  DepartmentId,
} from './types';
import { buildPrompt, buildRepairPrompt } from './prompt-builder';
import { callProviderWithFallback } from './provider';
import { parseDocumentOutput, validate, validationErrorMessages } from './validator';
import { computeQualityScoreWithValidation } from './quality-score';
import { checksumObject } from './checksum';
import { loadSchema } from './schema-loader';
import { loadLanguage } from './language-loader';
import { loadCountry } from './country-loader';
import { loadIndustry } from './industry-loader';
import { loadDepartment } from './department-loader';
import { loadTopic } from './topic-loader';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a single knowledge document from an explicit context.
 * The caller is responsible for populating all context fields.
 */
export async function generateDocument(
  context: GenerationContext,
  credentials: ProviderCredentials = {}
): Promise<DocumentResult> {
  const startedAt = Date.now();
  const { config, industry, department, topic } = context;
  const outputFilePath = resolveOutputPath(context);

  // Skip if file exists and overwrite is disabled
  if (!config.output.overwriteExisting) {
    const exists = await fileExists(outputFilePath);
    if (exists) {
      return makeResult(context, outputFilePath, 0, 'skipped', startedAt);
    }
  }

  // Dry-run: report what would be generated without calling the LLM
  if (config.generation.dryRun) {
    log(config, 'info', `[dry-run] ${industry.id}/${department.id}/${topic.id}`);
    return makeResult(context, outputFilePath, 0, 'dry-run', startedAt);
  }

  try {
    const doc = await generateWithRetry(context, credentials, config.provider.retries);
    const filePath = await writeDocument(doc, outputFilePath, context);
    const qualityScore = computeQualityScoreWithValidation(doc, context.schema, context, validate(doc, context.schema, context));
    return makeResult(context, filePath, qualityScore.total, 'success', startedAt, undefined, doc.id);
  } catch (err) {
    const message = (err as Error).message;
    log(config, 'error', `FAILED ${industry.id}/${department.id}/${topic.id}: ${message}`);
    return makeResult(context, outputFilePath, 0, 'failed', startedAt, message);
  }
}

/**
 * Build a GenerationContext from individual IDs and the loaded config.
 * Throws if any ID is invalid or not enabled.
 */
export async function buildContext(
  industryId: IndustryId,
  departmentId: DepartmentId,
  topicId: string,
  languageCode: string,
  countryCode: string,
  config: GeneratorConfig,
  runId: string
): Promise<GenerationContext> {
  const [industry, department, topic, language, country] = await Promise.all([
    loadIndustry(industryId),
    loadDepartment(departmentId),
    loadTopic(industryId, departmentId, topicId),
    loadLanguage(languageCode),
    loadCountry(countryCode),
  ]);
  const schema = await loadSchema(department.schemaType, config.schemasRoot);

  return { industry, department, topic, language, country, schema, config, runId };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function generateWithRetry(
  context: GenerationContext,
  credentials: ProviderCredentials,
  retriesRemaining: number
): Promise<GeneratedDocument> {
  const { config } = context;
  let lastError: string | null = null;
  let failedOutput: string | null = null;
  let attemptErrors: string[] = [];

  for (let attempt = 0; attempt <= retriesRemaining; attempt++) {
    if (attempt > 0) {
      await delay(config.provider.retryDelayMs);
    }

    const prompt =
      attempt === 0 || !failedOutput
        ? buildPrompt(context)
        : buildRepairPrompt(context, failedOutput, attemptErrors);

    let rawContent: string;
    try {
      const response = await callProviderWithFallback(prompt, config, credentials);
      rawContent = response.content;
    } catch (err) {
      lastError = (err as Error).message;
      log(config, 'warn', `Attempt ${attempt + 1} provider error: ${lastError}`);
      failedOutput = null;
      continue;
    }

    const { doc, error: parseError } = parseDocumentOutput(rawContent);
    if (!doc) {
      lastError = parseError ?? 'Failed to parse LLM output as JSON';
      failedOutput = rawContent;
      attemptErrors = [lastError];
      log(config, 'warn', `Attempt ${attempt + 1} parse error: ${lastError}`);
      continue;
    }

    const validation = validate(doc, context.schema, context);
    if (!validation.valid && config.validation.maxErrors === 0) {
      attemptErrors = validationErrorMessages(validation);
      lastError = `Validation failed: ${attemptErrors.slice(0, 3).join('; ')}`;
      failedOutput = rawContent;
      log(config, 'warn', `Attempt ${attempt + 1} validation failed (${validation.errors.length} errors)`);
      continue;
    }

    // Stamp checksum and return
    const finalDoc: GeneratedDocument = {
      ...doc,
      checksum: checksumObject(doc),
    };
    return finalDoc;
  }

  throw new Error(lastError ?? 'Max retries exceeded with no successful generation');
}

function resolveOutputPath(context: GenerationContext): string {
  const { config, industry, department, topic } = context;
  const filename = `${topic.id}.json`;
  return path.join(config.packRoot, industry.id, department.id, filename);
}

async function writeDocument(
  doc: GeneratedDocument,
  filePath: string,
  context: GenerationContext
): Promise<string> {
  const { config, industry, department, topic } = context;
  const qualityResult = computeQualityScoreWithValidation(
    doc,
    context.schema,
    context,
    validate(doc, context.schema, context)
  );

  // Quarantine if quality is below threshold
  if (qualityResult.total < config.quality.quarantineBelowScore) {
    const quarantineDir = path.join(
      config.output.quarantinePath,
      industry.id,
      department.id
    );
    await mkdir(quarantineDir, { recursive: true });
    const quarantinePath = path.join(quarantineDir, `${topic.id}.json`);
    await writeFile(quarantinePath, serializeDoc(doc, config), 'utf8');
    log(config, 'warn', `Quarantined (score=${qualityResult.total}): ${quarantinePath}`);
    return quarantinePath;
  }

  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, serializeDoc(doc, config), 'utf8');
  log(config, 'info', `Written (score=${qualityResult.total}): ${filePath}`);
  return filePath;
}

function serializeDoc(doc: GeneratedDocument, config: GeneratorConfig): string {
  return config.output.prettyPrint ? JSON.stringify(doc, null, 2) : JSON.stringify(doc);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function makeResult(
  context: GenerationContext,
  filePath: string,
  qualityScore: number,
  status: DocumentResult['status'],
  startedAt: number,
  error?: string,
  documentId?: string
): DocumentResult {
  return {
    industry: context.industry.id,
    department: context.department.id,
    topic: context.topic.id,
    filePath,
    documentId: documentId ?? randomUUID(),
    qualityScore,
    status,
    error,
    durationMs: Date.now() - startedAt,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(config: GeneratorConfig, level: 'info' | 'warn' | 'error', message: string): void {
  if (config.logging.level === 'error' && level !== 'error') return;
  if (config.logging.level === 'warn' && level === 'info') return;

  const entry =
    config.logging.format === 'json'
      ? JSON.stringify({ level, message, ...(config.logging.includeTimestamps && { ts: new Date().toISOString() }) })
      : `[${level.toUpperCase()}] ${message}`;

  process.stderr.write(`${entry}\n`);
}
