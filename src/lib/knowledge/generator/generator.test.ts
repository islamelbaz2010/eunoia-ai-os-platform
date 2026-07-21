import { describe, it, expect, beforeEach } from 'vitest';
import path from 'node:path';

import {
  checksumString,
  checksumObject,
  isValidChecksum,
  emptyChecksum,
  digestOnly,
} from './checksum';

import {
  parseDocumentOutput,
  validate,
  validationErrorMessages,
} from './validator';

import { computeQualityScore } from './quality-score';

import { buildPrompt } from './prompt-builder';

import {
  loadAllIndustries,
  loadEnabledIndustries,
  loadIndustry,
  isValidIndustry,
  clearIndustryCache,
} from './industry-loader';

import {
  loadAllDepartments,
  loadEnabledDepartments,
  loadDepartment,
  isValidDepartment,
  clearDepartmentCache,
} from './department-loader';

import {
  loadTopics,
  loadTopic,
  countTopics,
  clearTopicCache,
} from './topic-loader';

import {
  loadAllLanguages,
  loadEnabledLanguages,
  loadLanguage,
  isValidLanguage,
  clearLanguageCache,
} from './language-loader';

import {
  loadAllCountries,
  loadEnabledCountries,
  loadCountry,
  isValidCountry,
  clearCountryCache,
} from './country-loader';

import { loadSchema, clearCache as clearSchemaCache, BASE_REQUIRED_FIELDS } from './schema-loader';
import { loadConfig } from './config';

import type { GeneratedDocument, GenerationContext, CanonicalSchema, GeneratorConfig } from './types';

// ─── Test fixtures ────────────────────────────────────────────────────────────

const SCHEMAS_ROOT = path.resolve(process.cwd(), 'knowledge/schemas');

function makeMinimalDoc(overrides: Partial<GeneratedDocument> = {}): GeneratedDocument {
  return {
    id: '123e4567-e89b-4d3c-a456-426614174000',
    schema_version: '1.0.0',
    title: 'Hotel FAQ Basics',
    version: '1.0.0',
    language: 'en',
    country: 'EG',
    industry: 'hotels',
    department: 'faq',
    tags: ['hotels', 'faq'],
    priority: 'medium',
    owner: 'system',
    last_updated: '2026-01-01T00:00:00Z',
    status: 'draft',
    ...overrides,
  };
}

// ─── Checksum tests ───────────────────────────────────────────────────────────

describe('checksumString', () => {
  it('returns a sha256-prefixed hex string', () => {
    const result = checksumString('hello');
    expect(result).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('produces deterministic output', () => {
    expect(checksumString('test')).toBe(checksumString('test'));
  });

  it('produces different output for different inputs', () => {
    expect(checksumString('a')).not.toBe(checksumString('b'));
  });
});

describe('checksumObject', () => {
  it('produces deterministic output regardless of key insertion order', () => {
    const a = checksumObject({ z: 1, a: 2 });
    const b = checksumObject({ a: 2, z: 1 });
    expect(a).toBe(b);
  });

  it('returns a valid checksum string', () => {
    expect(isValidChecksum(checksumObject({ x: 1 }))).toBe(true);
  });
});

describe('isValidChecksum', () => {
  it('accepts valid sha256 checksum', () => {
    expect(isValidChecksum(`sha256:${'a'.repeat(64)}`)).toBe(true);
  });

  it('rejects short checksums', () => {
    expect(isValidChecksum('sha256:abc')).toBe(false);
  });

  it('rejects missing prefix', () => {
    expect(isValidChecksum('a'.repeat(64))).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isValidChecksum(42)).toBe(false);
    expect(isValidChecksum(null)).toBe(false);
  });
});

describe('emptyChecksum', () => {
  it('is a valid-format but zero-content checksum', () => {
    const ec = emptyChecksum();
    expect(ec).toMatch(/^sha256:0{64}$/);
  });
});

describe('digestOnly', () => {
  it('strips the sha256: prefix', () => {
    const hex = 'a'.repeat(64);
    expect(digestOnly(`sha256:${hex}`)).toBe(hex);
  });

  it('returns the input unchanged if no prefix', () => {
    expect(digestOnly('rawvalue')).toBe('rawvalue');
  });
});

// ─── parseDocumentOutput tests ────────────────────────────────────────────────

describe('parseDocumentOutput', () => {
  it('parses a plain JSON object string', () => {
    const raw = JSON.stringify({ id: 'test', title: 'T' });
    const { doc, error } = parseDocumentOutput(raw);
    expect(error).toBeNull();
    expect(doc).not.toBeNull();
    expect(doc?.id).toBe('test');
  });

  it('strips markdown json code fences', () => {
    const raw = '```json\n{ "id": "x" }\n```';
    const { doc, error } = parseDocumentOutput(raw);
    expect(error).toBeNull();
    expect(doc?.id).toBe('x');
  });

  it('strips bare code fences', () => {
    const raw = '```\n{ "id": "y" }\n```';
    const { doc, error } = parseDocumentOutput(raw);
    expect(error).toBeNull();
    expect(doc?.id).toBe('y');
  });

  it('returns error for non-JSON content', () => {
    const { doc, error } = parseDocumentOutput('This is not JSON at all');
    expect(doc).toBeNull();
    expect(error).not.toBeNull();
  });

  it('returns error for empty string', () => {
    const { doc, error } = parseDocumentOutput('');
    expect(doc).toBeNull();
    expect(error).not.toBeNull();
  });

  it('handles leading text before JSON', () => {
    const raw = 'Here is the document:\n{"id":"z"}';
    const { doc, error } = parseDocumentOutput(raw);
    expect(error).toBeNull();
    expect(doc?.id).toBe('z');
  });
});

// ─── validate tests ───────────────────────────────────────────────────────────

describe('validate', () => {
  let schema: CanonicalSchema;

  beforeEach(() => {
    schema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'FAQ',
      description: 'FAQ schema',
      type: 'object',
      required: [...BASE_REQUIRED_FIELDS] as string[],
      properties: Object.fromEntries([...BASE_REQUIRED_FIELDS].map((f) => [f, { type: 'string' }])),
      additionalProperties: true,
    };
  });

  // Minimal valid context (schema/config not used in validator calls below)
  const mockContext = {
    industry: { id: 'hotels', name: 'Hotels', code: 'HTL', description: '', naicsCode: '', domains: [], promptContext: '', keyTerminology: [], regulatoryContext: [], enabled: true },
    department: { id: 'faq', name: 'FAQ', description: '', schemaType: 'faq' as const, documentTypes: [], promptGuidance: '', enabled: true },
    topic: { id: 'basics', name: 'Basics', description: '', schemaType: 'faq' as const, priority: 'medium' as const, tags: [], estimatedDocuments: 1, documentTypes: [] },
    language: { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' as const, enabled: true, promptLanguage: 'English' },
    country: { code: 'EG', name: 'Egypt', region: 'MENA', defaultLanguage: 'ar', enabled: true, industries: ['hotels'] as Array<'hotels'> },
    schema: {} as CanonicalSchema,
    config: { validation: { requireAllRequiredFields: true, failOnWarnings: false, maxErrors: 0, maxWarnings: 5, checksumAlgorithm: 'sha256' as const, validateLanguageCode: true, validateCountryCode: true, validateUuid: true, validateSemver: true } } as GeneratorConfig,
    runId: 'test-run',
  } as GenerationContext;

  it('passes a fully valid document', () => {
    const doc = makeMinimalDoc();
    const result = validate(doc, schema, mockContext);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when a required field is missing', () => {
    const doc = makeMinimalDoc({ title: undefined as unknown as string });
    const result = validate(doc, schema, mockContext);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'title')).toBe(true);
  });

  it('fails for invalid UUID format in id', () => {
    const doc = makeMinimalDoc({ id: 'not-a-uuid' });
    const result = validate(doc, schema, mockContext);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.ruleId === 'FMT-001')).toBe(true);
  });

  it('fails for invalid semver in version', () => {
    const doc = makeMinimalDoc({ version: 'v1' });
    const result = validate(doc, schema, mockContext);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.ruleId === 'FMT-002')).toBe(true);
  });

  it('fails for invalid BCP-47 language code', () => {
    const doc = makeMinimalDoc({ language: 'english' });
    const result = validate(doc, schema, mockContext);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.ruleId === 'FMT-003')).toBe(true);
  });

  it('fails for invalid ISO 3166-1 country code', () => {
    const doc = makeMinimalDoc({ country: 'egypt' });
    const result = validate(doc, schema, mockContext);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.ruleId === 'FMT-004')).toBe(true);
  });

  it('fails when industry does not match context', () => {
    const doc = makeMinimalDoc({ industry: 'restaurants' });
    const result = validate(doc, schema, mockContext);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.ruleId === 'BUS-001')).toBe(true);
  });

  it('fails for placeholder content in title', () => {
    const doc = makeMinimalDoc({ title: '[INSERT TITLE HERE]' });
    const result = validate(doc, schema, mockContext);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.ruleId === 'BUS-005')).toBe(true);
  });

  it('fails for invalid priority enum', () => {
    const doc = makeMinimalDoc({ priority: 'urgent' as 'medium' });
    const result = validate(doc, schema, mockContext);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.ruleId === 'ENM-001')).toBe(true);
  });

  it('returns validationErrorMessages as a string array', () => {
    const doc = makeMinimalDoc({ id: 'bad-id' });
    const result = validate(doc, schema, mockContext);
    const messages = validationErrorMessages(result);
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);
    expect(typeof messages[0]).toBe('string');
  });
});

// ─── computeQualityScore tests ────────────────────────────────────────────────

describe('computeQualityScore', () => {
  const schema: CanonicalSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'Test',
    description: '',
    type: 'object',
    required: [...BASE_REQUIRED_FIELDS] as string[],
    properties: Object.fromEntries([...BASE_REQUIRED_FIELDS].map((f) => [f, { type: 'string' }])),
    additionalProperties: true,
  };

  const mockContext = {
    industry: { id: 'hotels', name: 'Hotels', code: 'HTL', description: '', naicsCode: '', domains: [], promptContext: '', keyTerminology: [], regulatoryContext: [], enabled: true },
    department: { id: 'faq', name: 'FAQ', description: '', schemaType: 'faq' as const, documentTypes: [], promptGuidance: '', enabled: true },
    topic: { id: 'basics', name: 'Basics', description: '', schemaType: 'faq' as const, priority: 'medium' as const, tags: [], estimatedDocuments: 1, documentTypes: [] },
    language: { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' as const, enabled: true, promptLanguage: 'English' },
    country: { code: 'EG', name: 'Egypt', region: 'MENA', defaultLanguage: 'ar', enabled: true, industries: ['hotels'] as Array<'hotels'> },
    schema,
    config: { quality: { minimumScore: 60, quarantineBelowScore: 40, weights: { coverage: 0.35, metadata: 0.25, consistency: 0.25, completeness: 0.15 } } } as GeneratorConfig,
    runId: 'test-run',
  } as GenerationContext;

  it('returns a score between 0 and 100', () => {
    const doc = makeMinimalDoc();
    const score = computeQualityScore(doc, schema, mockContext);
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
  });

  it('returns a grade', () => {
    const doc = makeMinimalDoc();
    const score = computeQualityScore(doc, schema, mockContext);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(score.grade);
  });

  it('returns a passed boolean', () => {
    const doc = makeMinimalDoc();
    const score = computeQualityScore(doc, schema, mockContext);
    expect(typeof score.passed).toBe('boolean');
  });

  it('score is lower for a doc with missing required fields', () => {
    const full = makeMinimalDoc();
    const partial = makeMinimalDoc({ owner: undefined as unknown as string });
    const s1 = computeQualityScore(full, schema, mockContext);
    const s2 = computeQualityScore(partial, schema, mockContext);
    expect(s1.total).toBeGreaterThan(s2.total);
  });
});

// ─── buildPrompt tests ────────────────────────────────────────────────────────

describe('buildPrompt', () => {
  const schema: CanonicalSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'FAQ',
    description: 'FAQ schema',
    type: 'object',
    required: ['id', 'title'],
    properties: { id: { type: 'string' }, title: { type: 'string' } },
    additionalProperties: true,
  };

  const context: GenerationContext = {
    industry: { id: 'hotels', name: 'Hotels', code: 'HTL', description: '', naicsCode: '', domains: [], promptContext: 'hospitality context', keyTerminology: ['PMS', 'RevPAR'], regulatoryContext: [], enabled: true },
    department: { id: 'faq', name: 'FAQ', description: 'Frequently asked questions', schemaType: 'faq', documentTypes: ['faq'], promptGuidance: 'Write clear Q&A pairs', enabled: true },
    topic: { id: 'hotel-basics', name: 'Hotel Basics', description: 'Core hotel operations', schemaType: 'faq', priority: 'high', tags: ['hotels', 'basics'], estimatedDocuments: 3, documentTypes: ['faq'] },
    language: { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', enabled: true, promptLanguage: 'English' },
    country: { code: 'EG', name: 'Egypt', region: 'MENA', defaultLanguage: 'ar', enabled: true, industries: ['hotels'] },
    schema,
    config: { generation: { defaultLanguage: 'en', defaultCountry: 'EG', temperature: 0.3, maxTokens: 4096, dryRun: false, batchSize: 10, delayBetweenRequestsMs: 1000, schemaVersion: '1.0.0', defaultPriority: 'medium', defaultStatus: 'draft' } } as GeneratorConfig,
    runId: 'test-run-001',
  };

  it('returns an LLMPrompt with system and user strings', () => {
    const prompt = buildPrompt(context);
    expect(typeof prompt.system).toBe('string');
    expect(typeof prompt.user).toBe('string');
    expect(prompt.system.length).toBeGreaterThan(50);
    expect(prompt.user.length).toBeGreaterThan(50);
  });

  it('includes the industry name in the prompt', () => {
    const prompt = buildPrompt(context);
    expect(prompt.system + prompt.user).toContain('Hotels');
  });

  it('includes the topic name in the user prompt', () => {
    const prompt = buildPrompt(context);
    expect(prompt.user).toContain('Hotel Basics');
  });

  it('includes JSON schema in the user prompt', () => {
    const prompt = buildPrompt(context);
    expect(prompt.user).toContain('"title"');
  });

  it('sets correct parameters', () => {
    const prompt = buildPrompt(context);
    expect(prompt.parameters.responseFormat).toBe('json');
    expect(typeof prompt.parameters.temperature).toBe('number');
    expect(typeof prompt.parameters.maxTokens).toBe('number');
  });

  it('includes context summary fields', () => {
    const prompt = buildPrompt(context);
    expect(prompt.context.industry).toBe('hotels');
    expect(prompt.context.department).toBe('faq');
    expect(prompt.context.topic).toBe('hotel-basics');
    expect(prompt.context.language).toBe('en');
    expect(prompt.context.country).toBe('EG');
  });
});

// ─── Loader integration tests ─────────────────────────────────────────────────

describe('industry-loader', () => {
  beforeEach(() => clearIndustryCache());

  it('loads all industries', async () => {
    const industries = await loadAllIndustries();
    expect(industries.length).toBeGreaterThanOrEqual(5);
  });

  it('returns only enabled industries', async () => {
    const enabled = await loadEnabledIndustries();
    expect(enabled.every((i) => i.enabled)).toBe(true);
  });

  it('loads hotels by id', async () => {
    const hotel = await loadIndustry('hotels');
    expect(hotel.id).toBe('hotels');
    expect(hotel.name).toBeTruthy();
  });

  it('throws for unknown industry id', async () => {
    await expect(loadIndustry('unknown-industry' as 'hotels')).rejects.toThrow();
  });

  it('validates industry id', async () => {
    expect(await isValidIndustry('hotels')).toBe(true);
    expect(await isValidIndustry('nonexistent')).toBe(false);
  });
});

describe('department-loader', () => {
  beforeEach(() => clearDepartmentCache());

  it('loads all departments', async () => {
    const departments = await loadAllDepartments();
    expect(departments.length).toBeGreaterThanOrEqual(13);
  });

  it('returns only enabled departments', async () => {
    const enabled = await loadEnabledDepartments();
    expect(enabled.every((d) => d.enabled)).toBe(true);
  });

  it('loads faq department by id', async () => {
    const dept = await loadDepartment('faq');
    expect(dept.id).toBe('faq');
    expect(dept.schemaType).toBeTruthy();
  });

  it('throws for unknown department id', async () => {
    await expect(loadDepartment('unknown-dept' as 'faq')).rejects.toThrow();
  });

  it('validates department id', async () => {
    expect(await isValidDepartment('faq')).toBe(true);
    expect(await isValidDepartment('nonexistent')).toBe(false);
  });
});

describe('topic-loader', () => {
  beforeEach(() => clearTopicCache());

  it('loads topics for a valid industry and department', async () => {
    const topics = await loadTopics('hotels', 'faq');
    expect(topics.length).toBeGreaterThan(0);
  });

  it('returns empty array for unknown combination', async () => {
    const topics = await loadTopics('hotels', 'analytics');
    expect(Array.isArray(topics)).toBe(true);
  });

  it('loads a specific topic by id', async () => {
    const topics = await loadTopics('hotels', 'faq');
    const first = topics[0];
    const loaded = await loadTopic('hotels', 'faq', first.id);
    expect(loaded.id).toBe(first.id);
  });

  it('throws for unknown topic id', async () => {
    await expect(loadTopic('hotels', 'faq', 'nonexistent-topic')).rejects.toThrow();
  });

  it('counts all topics', async () => {
    const count = await countTopics();
    expect(count).toBeGreaterThanOrEqual(100);
  });
});

describe('language-loader', () => {
  beforeEach(() => clearLanguageCache());

  it('loads all languages', async () => {
    const langs = await loadAllLanguages();
    expect(langs.length).toBeGreaterThan(0);
  });

  it('returns only enabled languages', async () => {
    const enabled = await loadEnabledLanguages();
    expect(enabled.every((l) => l.enabled)).toBe(true);
  });

  it('loads English by code', async () => {
    const lang = await loadLanguage('en');
    expect(lang.code).toBe('en');
  });

  it('throws for unknown language code', async () => {
    await expect(loadLanguage('xx')).rejects.toThrow();
  });

  it('validates language codes', async () => {
    expect(await isValidLanguage('en')).toBe(true);
    expect(await isValidLanguage('zz')).toBe(false);
  });
});

describe('country-loader', () => {
  beforeEach(() => clearCountryCache());

  it('loads all countries', async () => {
    const countries = await loadAllCountries();
    expect(countries.length).toBeGreaterThan(0);
  });

  it('returns only enabled countries', async () => {
    const enabled = await loadEnabledCountries();
    expect(enabled.every((c) => c.enabled)).toBe(true);
  });

  it('loads Egypt by code', async () => {
    const country = await loadCountry('EG');
    expect(country.code).toBe('EG');
  });

  it('throws for unknown country code', async () => {
    await expect(loadCountry('ZZ')).rejects.toThrow();
  });

  it('validates country codes', async () => {
    expect(await isValidCountry('EG')).toBe(true);
    expect(await isValidCountry('XX')).toBe(false);
  });
});

// ─── Schema loader tests ──────────────────────────────────────────────────────

describe('schema-loader', () => {
  beforeEach(() => clearSchemaCache());

  it('loads faq schema', async () => {
    const schema = await loadSchema('faq', SCHEMAS_ROOT);
    expect(schema.title).toBeTruthy();
    expect(Array.isArray(schema.required)).toBe(true);
    expect(schema.required.length).toBeGreaterThan(0);
  });

  it('loads all 15 schema types without error', async () => {
    const types = [
      'document', 'faq', 'playbook', 'policy', 'prompt',
      'automation', 'template', 'campaign', 'persona', 'offer',
      'service', 'department', 'kpi', 'checklist', 'metadata',
    ] as const;
    for (const t of types) {
      const schema = await loadSchema(t, SCHEMAS_ROOT);
      expect(schema).toBeTruthy();
    }
  });

  it('throws for unknown schema type', async () => {
    await expect(loadSchema('unknown' as 'faq', SCHEMAS_ROOT)).rejects.toThrow();
  });

  it('caches schema after first load', async () => {
    const a = await loadSchema('faq', SCHEMAS_ROOT);
    const b = await loadSchema('faq', SCHEMAS_ROOT);
    expect(a).toBe(b);
  });
});

// ─── Config loader tests ──────────────────────────────────────────────────────

describe('loadConfig', () => {
  it('loads config with resolved absolute paths', () => {
    const config = loadConfig();
    expect(path.isAbsolute(config.packRoot)).toBe(true);
    expect(path.isAbsolute(config.schemasRoot)).toBe(true);
    expect(path.isAbsolute(config.knowledgeRoot)).toBe(true);
    expect(path.isAbsolute(config.output.quarantinePath)).toBe(true);
    expect(path.isAbsolute(config.output.logPath)).toBe(true);
    expect(path.isAbsolute(config.output.reportPath)).toBe(true);
  });

  it('has the expected primary provider', () => {
    const config = loadConfig();
    expect(['claude', 'openai', 'gemini']).toContain(config.provider.primary);
  });

  it('has valid generation defaults', () => {
    const config = loadConfig();
    expect(config.generation.maxTokens).toBeGreaterThan(0);
    expect(config.generation.temperature).toBeGreaterThanOrEqual(0);
    expect(config.generation.temperature).toBeLessThanOrEqual(2);
    expect(config.generation.batchSize).toBeGreaterThan(0);
  });
});
