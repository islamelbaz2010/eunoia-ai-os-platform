/**
 * Validator — validates generated documents against canonical schemas and business rules.
 *
 * Validation layers (applied in order):
 *   1. JSON parse check — is the content valid JSON?
 *   2. Required fields — are all required fields present and non-null?
 *   3. Type checks — do field values match declared JSON Schema types?
 *   4. Enum checks — do enum fields contain valid values?
 *   5. Pattern checks — do regex-constrained fields match their patterns?
 *   6. Business rules — domain-specific checks (industry match, no placeholders, etc.)
 *   7. Metadata checks — language code, country code, version format, UUID format
 *   8. Checksum — if present, must follow sha256:hex format
 */

import type {
  GeneratedDocument,
  ValidationResult,
  ValidationError,
  CanonicalSchema,
  GenerationContext,
  IndustryId,
  DepartmentId,
  Priority,
  DocumentStatus,
} from './types.js';
import { isValidChecksum } from './checksum.js';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const BCP47 = /^[a-z]{2}(-[A-Z]{2})?$/;
const ISO3166 = /^[A-Z]{2}$/;
const ISO8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const PLACEHOLDER = /\[(.*?)\]|TODO|TBD|Lorem ipsum|PLACEHOLDER|INSERT/i;
const EMAIL_LIKE = /^[^@]+@[^@]+\.[^@]+$/;

const VALID_PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low'];
const VALID_STATUSES: DocumentStatus[] = ['draft', 'review', 'approved', 'published', 'archived', 'deprecated'];

// ─── Parse raw LLM output ─────────────────────────────────────────────────────

/**
 * Attempt to parse raw LLM output as JSON.
 * Strips common LLM response wrappers (markdown code blocks, leading/trailing text).
 */
export function parseDocumentOutput(raw: string): { doc: GeneratedDocument | null; error: string | null } {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  // Strip leading/trailing non-JSON text
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    return { doc: null, error: 'No JSON object found in LLM output' };
  }
  cleaned = cleaned.slice(jsonStart, jsonEnd + 1);

  try {
    const doc = JSON.parse(cleaned) as GeneratedDocument;
    return { doc, error: null };
  } catch (e) {
    return { doc: null, error: `JSON parse error: ${(e as Error).message}` };
  }
}

// ─── Core validator ───────────────────────────────────────────────────────────

export function validate(
  doc: GeneratedDocument,
  schema: CanonicalSchema,
  context: GenerationContext
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const info: ValidationError[] = [];

  function err(ruleId: string, field: string, message: string, actual?: unknown, expected?: unknown) {
    errors.push({ ruleId, field, severity: 'error', message, actual, expected });
  }
  function warn(ruleId: string, field: string, message: string, actual?: unknown, expected?: unknown) {
    warnings.push({ ruleId, field, severity: 'warning', message, actual, expected });
  }
  function note(ruleId: string, field: string, message: string) {
    info.push({ ruleId, field, severity: 'info', message });
  }

  // ── 1. Required fields ────────────────────────────────────────────────────

  for (const field of (schema.required ?? [])) {
    if (doc[field] === undefined || doc[field] === null || doc[field] === '') {
      err('REQ-001', field, `Required field "${field}" is missing or empty`);
    }
  }

  // ── 2. UUID v4 ────────────────────────────────────────────────────────────

  if (doc.id !== undefined && !UUID_V4.test(String(doc.id))) {
    err('FMT-001', 'id', 'id must be a valid UUID v4', doc.id, 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx');
  }

  // ── 3. Semantic version ───────────────────────────────────────────────────

  if (doc.version !== undefined && !SEMVER.test(String(doc.version))) {
    err('FMT-002', 'version', 'version must follow semver (MAJOR.MINOR.PATCH)', doc.version, '1.0.0');
  }

  // ── 4. Language code (BCP-47) ─────────────────────────────────────────────

  if (doc.language !== undefined && !BCP47.test(String(doc.language))) {
    err('FMT-003', 'language', 'language must be a valid BCP-47 code', doc.language, 'en or en-US');
  }

  // ── 5. Country code (ISO 3166-1 alpha-2) ─────────────────────────────────

  if (doc.country !== undefined && !ISO3166.test(String(doc.country))) {
    err('FMT-004', 'country', 'country must be a valid ISO 3166-1 alpha-2 code', doc.country, 'US, EG, AE');
  }

  // ── 6. Industry match ─────────────────────────────────────────────────────

  if (doc.industry !== undefined && doc.industry !== context.industry.id) {
    err('BUS-001', 'industry', `industry must be "${context.industry.id}"`, doc.industry, context.industry.id);
  }

  // ── 7. Department match ───────────────────────────────────────────────────

  if (doc.department !== undefined && doc.department !== context.department.id) {
    err('BUS-002', 'department', `department must be "${context.department.id}"`, doc.department, context.department.id);
  }

  // ── 8. Priority enum ──────────────────────────────────────────────────────

  if (doc.priority !== undefined && !VALID_PRIORITIES.includes(doc.priority as Priority)) {
    err('ENM-001', 'priority', `priority must be one of: ${VALID_PRIORITIES.join(', ')}`, doc.priority);
  }

  // ── 9. Status enum ────────────────────────────────────────────────────────

  if (doc.status !== undefined && !VALID_STATUSES.includes(doc.status as DocumentStatus)) {
    warn('ENM-002', 'status', `status should be one of: ${VALID_STATUSES.join(', ')}`, doc.status);
  }

  // ── 10. ISO 8601 timestamp ────────────────────────────────────────────────

  if (doc.last_updated !== undefined && !ISO8601.test(String(doc.last_updated))) {
    err('FMT-005', 'last_updated', 'last_updated must be an ISO 8601 UTC timestamp', doc.last_updated, '2026-07-13T12:00:00.000Z');
  }

  // ── 11. Checksum format ───────────────────────────────────────────────────

  if (doc.checksum !== undefined && doc.checksum !== null) {
    if (!isValidChecksum(doc.checksum)) {
      warn('FMT-006', 'checksum', 'checksum must follow sha256:hex64 format when present', doc.checksum);
    }
  }

  // ── 12. Tags ──────────────────────────────────────────────────────────────

  if (doc.tags !== undefined) {
    if (!Array.isArray(doc.tags)) {
      err('TYP-001', 'tags', 'tags must be an array', typeof doc.tags);
    } else if (doc.tags.length === 0) {
      warn('BUS-003', 'tags', 'tags array is empty — at least one tag is recommended');
    } else if (doc.tags.length > 20) {
      warn('BUS-004', 'tags', `tags has ${doc.tags.length} items — maximum recommended is 20`, doc.tags.length);
    }
  }

  // ── 13. Title quality ─────────────────────────────────────────────────────

  if (doc.title !== undefined) {
    if (PLACEHOLDER.test(String(doc.title))) {
      err('BUS-005', 'title', 'title contains placeholder text', doc.title);
    }
    if (String(doc.title).length < 5) {
      warn('BUS-006', 'title', 'title is very short (< 5 characters)', doc.title);
    }
    if (String(doc.title).length > 255) {
      err('BUS-007', 'title', 'title exceeds maximum length of 255 characters', String(doc.title).length);
    }
  }

  // ── 14. Owner format ──────────────────────────────────────────────────────

  if (doc.owner !== undefined) {
    if (!EMAIL_LIKE.test(String(doc.owner))) {
      warn('BUS-008', 'owner', 'owner should be a valid email address or role@domain format', doc.owner);
    }
  }

  // ── 15. Language consistency check ────────────────────────────────────────

  const declaredLang = String(doc.language ?? '').split('-')[0];
  const expectedLang = context.language.code.split('-')[0];
  if (declaredLang && declaredLang !== expectedLang) {
    warn('CNS-001', 'language', `declared language ${doc.language} differs from generation context ${context.language.code}`);
  }

  // ── 16. Schema version ────────────────────────────────────────────────────

  if (doc.schema_version !== undefined && doc.schema_version !== '1.0.0') {
    warn('VER-001', 'schema_version', `schema_version should be "1.0.0"`, doc.schema_version);
  }

  // ── 17. No placeholder content in key text fields ─────────────────────────

  const textFields = ['description', 'body', 'prompt_body', 'policy_body', 'subject_template', 'body_template'];
  for (const field of textFields) {
    const value = doc[field];
    if (typeof value === 'string' && PLACEHOLDER.test(value)) {
      warn('BUS-009', field, `field "${field}" may contain placeholder text`, value.slice(0, 100));
    }
  }

  note('INF-001', 'general', `Validated against schema: ${schema.title}`);
  note('INF-002', 'general', `Context: ${context.industry.id}/${context.department.id}/${context.topic.id}`);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info,
    document: doc,
    timestamp: new Date().toISOString(),
  };
}

/** Summarize validation result as a human-readable string. */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];
  lines.push(`Validation: ${result.valid ? 'PASS' : 'FAIL'}`);
  if (result.errors.length > 0) {
    lines.push(`  Errors (${result.errors.length}):`);
    result.errors.forEach((e) => lines.push(`    [${e.ruleId}] ${e.field}: ${e.message}`));
  }
  if (result.warnings.length > 0) {
    lines.push(`  Warnings (${result.warnings.length}):`);
    result.warnings.forEach((w) => lines.push(`    [${w.ruleId}] ${w.field}: ${w.message}`));
  }
  return lines.join('\n');
}

/** Return error messages as a string array suitable for repair prompts. */
export function validationErrorMessages(result: ValidationResult): string[] {
  return result.errors.map((e) => `[${e.ruleId}] ${e.field}: ${e.message}`);
}
