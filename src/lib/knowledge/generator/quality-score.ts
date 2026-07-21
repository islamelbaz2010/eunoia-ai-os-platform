/**
 * Quality Scorer — computes a 0–100 quality score for generated documents.
 *
 * Dimensions (weighted):
 *   coverage     (35%) — required + recommended fields are populated
 *   metadata     (25%) — metadata fields are accurate and well-formed
 *   consistency  (25%) — content matches declared industry/dept/language/country
 *   completeness (15%) — content is substantive, not minimal or generic
 *
 * Grade thresholds:
 *   A  90–100
 *   B  75–89
 *   C  60–74
 *   D  40–59
 *   F   0–39
 */

import type {
  GeneratedDocument,
  QualityScore,
  QualityDimension,
  GenerationContext,
  CanonicalSchema,
  ValidationResult,
} from './types';
import { isValidChecksum } from './checksum';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const BCP47 = /^[a-z]{2}(-[A-Z]{2})?$/;
const ISO3166 = /^[A-Z]{2}$/;
const ISO8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const PLACEHOLDER = /\[(.*?)\]|TODO|TBD|Lorem ipsum|PLACEHOLDER|INSERT/i;
const EMAIL_LIKE = /^[^@]+@[^@]+\.[^@]+$/;

// ─── Dimension scorers ────────────────────────────────────────────────────────

function scoreCoverage(
  doc: GeneratedDocument,
  schema: CanonicalSchema,
  _context: GenerationContext
): QualityDimension {
  const required = schema.required ?? [];
  const allProperties = Object.keys(schema.properties ?? {});
  const optional = allProperties.filter((p) => !required.includes(p));

  const details: string[] = [];
  let earned = 0;

  const reqPoints = required.length > 0 ? 70 / required.length : 70;
  let reqEarned = 0;
  for (const field of required) {
    const val = doc[field];
    if (val !== undefined && val !== null && val !== '') {
      reqEarned += reqPoints;
    } else {
      details.push(`Missing required field: ${field}`);
    }
  }
  earned += reqEarned;

  const optionalPopulated = optional.filter((f) => {
    const v = doc[f];
    return v !== undefined && v !== null && v !== '';
  });
  const optionalScore = optional.length > 0
    ? (optionalPopulated.length / optional.length) * 30
    : 30;
  earned += optionalScore;

  if (optionalPopulated.length < optional.length) {
    details.push(`${optional.length - optionalPopulated.length} optional field(s) not populated`);
  }

  return { name: 'coverage', score: Math.round(earned), maxScore: 100, details };
}

function scoreMetadata(
  doc: GeneratedDocument,
  _schema: CanonicalSchema,
  _context: GenerationContext
): QualityDimension {
  const details: string[] = [];
  let earned = 0;
  const checks: Array<[number, boolean, string]> = [
    [15, UUID_V4.test(String(doc.id ?? '')), 'id is valid UUID v4'],
    [15, SEMVER.test(String(doc.version ?? '')), 'version is valid semver'],
    [15, BCP47.test(String(doc.language ?? '')), 'language is valid BCP-47'],
    [15, ISO3166.test(String(doc.country ?? '')), 'country is valid ISO 3166-1 alpha-2'],
    [15, ISO8601.test(String(doc.last_updated ?? '')), 'last_updated is ISO 8601'],
    [10, EMAIL_LIKE.test(String(doc.owner ?? '')), 'owner is email-like'],
    [10, isValidChecksum(doc.checksum), 'checksum is present and valid'],
    [5, String(doc.schema_version ?? '') === '1.0.0', 'schema_version is 1.0.0'],
  ];

  for (const [points, pass, label] of checks) {
    if (pass) {
      earned += points;
    } else {
      details.push(`Failed: ${label}`);
    }
  }

  return { name: 'metadata', score: Math.round(earned), maxScore: 100, details };
}

function scoreConsistency(
  doc: GeneratedDocument,
  _schema: CanonicalSchema,
  context: GenerationContext
): QualityDimension {
  const details: string[] = [];
  let earned = 0;

  if (doc.industry === context.industry.id) {
    earned += 30;
  } else {
    details.push(`industry mismatch: got "${doc.industry}", expected "${context.industry.id}"`);
  }

  if (doc.department === context.department.id) {
    earned += 30;
  } else {
    details.push(`department mismatch: got "${doc.department}", expected "${context.department.id}"`);
  }

  const declaredLang = String(doc.language ?? '').split('-')[0];
  const expectedLang = context.language.code.split('-')[0];
  if (declaredLang === expectedLang) {
    earned += 20;
  } else {
    details.push(`language mismatch: declared ${doc.language}, context ${context.language.code}`);
  }

  if (doc.country === context.country.code) {
    earned += 20;
  } else {
    details.push(`country mismatch: declared ${doc.country}, context ${context.country.code}`);
  }

  return { name: 'consistency', score: Math.round(earned), maxScore: 100, details };
}

function scoreCompleteness(
  doc: GeneratedDocument,
  schema: CanonicalSchema,
  _context: GenerationContext
): QualityDimension {
  const details: string[] = [];
  let earned = 0;

  const title = String(doc.title ?? '');
  if (title.length >= 10 && !PLACEHOLDER.test(title)) {
    earned += 20;
  } else if (title.length >= 5) {
    earned += 10;
    if (PLACEHOLDER.test(title)) details.push('title contains placeholder text');
    else details.push('title is short (< 10 chars)');
  } else {
    details.push('title is missing or too short');
  }

  const tags = Array.isArray(doc.tags) ? doc.tags : [];
  if (tags.length >= 3) earned += 20;
  else if (tags.length >= 1) { earned += 10; details.push(`only ${tags.length} tag(s) — 3+ recommended`); }
  else details.push('tags array is empty');

  const contentFields = ['body', 'prompt_body', 'policy_body', 'body_template', 'answer', 'scope', 'formula'];
  const allProps = Object.keys(schema.properties ?? {});
  const relevantContentFields = allProps.filter((f) => contentFields.includes(f));

  if (relevantContentFields.length > 0) {
    const contentPoints = 40 / relevantContentFields.length;
    for (const field of relevantContentFields) {
      const val = String(doc[field] ?? '');
      if (val.length >= 100 && !PLACEHOLDER.test(val)) {
        earned += contentPoints;
      } else if (val.length >= 20) {
        earned += contentPoints * 0.5;
        details.push(`field "${field}" is short (${val.length} chars)`);
      } else {
        details.push(`field "${field}" is empty or too short`);
      }
    }
  } else {
    const populated = Object.values(doc).filter((v) =>
      v !== null && v !== undefined && v !== '' && !PLACEHOLDER.test(String(v))
    ).length;
    const total = Object.keys(schema.properties ?? {}).length || 10;
    earned += Math.min(40, (populated / total) * 40);
  }

  const allStringValues = Object.values(doc).filter((v) => typeof v === 'string');
  const hasPlaceholders = allStringValues.some((v) => PLACEHOLDER.test(v as string));
  if (!hasPlaceholders) {
    earned += 20;
  } else {
    details.push('one or more fields contain placeholder text');
  }

  return { name: 'completeness', score: Math.round(Math.min(100, earned)), maxScore: 100, details };
}

// ─── Grade calculator ─────────────────────────────────────────────────────────

function gradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

// ─── Main scorer ──────────────────────────────────────────────────────────────

export function computeQualityScore(
  doc: GeneratedDocument,
  schema: CanonicalSchema,
  context: GenerationContext
): QualityScore {
  const weights = context.config.quality.weights;
  const minimum = context.config.quality.minimumScore;

  const coverage = scoreCoverage(doc, schema, context);
  const metadata = scoreMetadata(doc, schema, context);
  const consistency = scoreConsistency(doc, schema, context);
  const completeness = scoreCompleteness(doc, schema, context);

  const total = Math.round(
    coverage.score * weights.coverage +
    metadata.score * weights.metadata +
    consistency.score * weights.consistency +
    completeness.score * weights.completeness
  );

  return {
    total,
    grade: gradeFromScore(total),
    dimensions: { coverage, metadata, consistency, completeness },
    passed: total >= minimum,
    minimumRequired: minimum,
  };
}

export function computeQualityScoreWithValidation(
  doc: GeneratedDocument,
  schema: CanonicalSchema,
  context: GenerationContext,
  validation: ValidationResult
): QualityScore {
  const base = computeQualityScore(doc, schema, context);

  const errorPenalty = validation.errors.length * 5;
  const warningPenalty = validation.warnings.length * 1;
  const adjusted = Math.max(0, base.total - errorPenalty - warningPenalty);

  return {
    ...base,
    total: adjusted,
    grade: gradeFromScore(adjusted),
    passed: adjusted >= base.minimumRequired,
  };
}

export function formatQualityScore(score: QualityScore): string {
  const lines = [
    `Quality Score: ${score.total}/100 (${score.grade}) — ${score.passed ? 'PASS' : 'FAIL'}`,
    `  Coverage:     ${score.dimensions.coverage.score}/100`,
    `  Metadata:     ${score.dimensions.metadata.score}/100`,
    `  Consistency:  ${score.dimensions.consistency.score}/100`,
    `  Completeness: ${score.dimensions.completeness.score}/100`,
  ];

  for (const dim of Object.values(score.dimensions)) {
    if (dim.details.length > 0) {
      lines.push(`  ${dim.name} issues:`);
      dim.details.forEach((d) => lines.push(`    - ${d}`));
    }
  }

  return lines.join('\n');
}
