/**
 * Schema Loader — loads and caches canonical JSON schemas from knowledge/schemas/.
 * Schemas are loaded once and kept in-process memory for the pipeline run.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { CanonicalSchema, SchemaType, GeneratorConfig } from './types.js';

const cache = new Map<SchemaType, CanonicalSchema>();

const SCHEMA_FILES: Record<SchemaType, string> = {
  document: 'document.schema.json',
  metadata: 'metadata.schema.json',
  faq: 'faq.schema.json',
  playbook: 'playbook.schema.json',
  policy: 'policy.schema.json',
  prompt: 'prompt.schema.json',
  automation: 'automation.schema.json',
  template: 'template.schema.json',
  campaign: 'campaign.schema.json',
  persona: 'persona.schema.json',
  offer: 'offer.schema.json',
  service: 'service.schema.json',
  department: 'department.schema.json',
  kpi: 'kpi.schema.json',
  checklist: 'checklist.schema.json',
};

/** Resolve the absolute path to a schema file. */
function schemaPath(schemasRoot: string, schemaType: SchemaType): string {
  const filename = SCHEMA_FILES[schemaType];
  if (!filename) throw new Error(`Unknown schema type: ${schemaType}`);
  return path.resolve(schemasRoot, filename);
}

/** Load a single schema by type. Caches after first load. */
export async function loadSchema(
  schemaType: SchemaType,
  config: GeneratorConfig
): Promise<CanonicalSchema> {
  if (cache.has(schemaType)) return cache.get(schemaType)!;

  const schemasRoot = path.resolve(__dirname, config.schemasRoot);
  const filePath = schemaPath(schemasRoot, schemaType);

  if (!existsSync(filePath)) {
    throw new Error(`Schema file not found: ${filePath}`);
  }

  const raw = await readFile(filePath, 'utf8');
  const schema = JSON.parse(raw) as CanonicalSchema;
  cache.set(schemaType, schema);
  return schema;
}

/** Pre-warm the cache by loading all schemas. Returns count of schemas loaded. */
export async function loadAllSchemas(config: GeneratorConfig): Promise<number> {
  const types = Object.keys(SCHEMA_FILES) as SchemaType[];
  await Promise.all(types.map((t) => loadSchema(t, config)));
  return types.length;
}

/** Return a cached schema or throw if not yet loaded. */
export function getSchema(schemaType: SchemaType): CanonicalSchema {
  const schema = cache.get(schemaType);
  if (!schema) throw new Error(`Schema not loaded: ${schemaType}. Call loadSchema() first.`);
  return schema;
}

/** Return the required fields list for a schema type. Falls back to base document fields. */
export function getRequiredFields(schemaType: SchemaType): string[] {
  const schema = cache.get(schemaType);
  if (!schema) return BASE_REQUIRED_FIELDS;
  return schema.required ?? BASE_REQUIRED_FIELDS;
}

/** Clear the schema cache (used in tests). */
export function clearCache(): void {
  cache.clear();
}

/** Retrieve a list of all available schema types. */
export function availableSchemaTypes(): SchemaType[] {
  return Object.keys(SCHEMA_FILES) as SchemaType[];
}

/** The base required fields shared across all schema types. */
export const BASE_REQUIRED_FIELDS = [
  'schema_version',
  'id',
  'title',
  'version',
  'language',
  'country',
  'industry',
  'department',
  'priority',
  'owner',
  'last_updated',
] as const;
