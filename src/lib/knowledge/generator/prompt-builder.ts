/**
 * Prompt Builder — generates LLM-agnostic prompts for knowledge document generation.
 *
 * Prompts are assembled at runtime from:
 *   - Industry context (terminology, regulatory environment)
 *   - Department guidance (document type, schema type)
 *   - Topic definition (specific subject matter)
 *   - Language and country target
 *   - Canonical schema (required fields, structure)
 *
 * The returned LLMPrompt is provider-agnostic and can be adapted to
 * Claude, OpenAI, or any future LLM.
 */

import type {
  GenerationContext,
  LLMPrompt,
  CanonicalSchema,
  Industry,
  Department,
  Topic,
  Language,
  Country,
} from './types';

// ─── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(
  industry: Industry,
  department: Department,
  language: Language,
  country: Country
): string {
  return [
    `You are an expert enterprise knowledge architect specializing in the ${industry.name} industry.`,
    '',
    `## Your Role`,
    `Generate a single, production-ready enterprise knowledge document in ${language.name} for the ${country.name} market.`,
    `The document must be immediately usable by ${industry.name} businesses — no placeholders, no lorem ipsum.`,
    '',
    `## Industry Context`,
    industry.promptContext,
    '',
    `## Key Terminology`,
    `Use these industry-standard terms where appropriate: ${industry.keyTerminology.join(', ')}.`,
    '',
    `## Regulatory Context`,
    `Be aware of: ${industry.regulatoryContext.join('; ')}.`,
    '',
    `## Department`,
    `You are generating for the "${department.name}" department: ${department.description}`,
    department.promptGuidance,
    '',
    `## Output Requirements`,
    `- Output ONLY valid JSON — no markdown, no explanation, no code blocks`,
    `- The JSON must conform exactly to the provided schema`,
    `- All required fields must be populated with real, substantive content`,
    `- Language: ${language.name} (${language.code}). Write all content in ${language.name}.`,
    `- Country: ${country.name} (${country.code}). Context and examples must be appropriate for ${country.name}.`,
    `- Do not invent company names, real individual names, or specific real organizations`,
    `- Do not include any content outside the JSON object`,
  ].join('\n');
}

// ─── User prompt builder ──────────────────────────────────────────────────────

function buildUserPrompt(
  industry: Industry,
  department: Department,
  topic: Topic,
  schema: CanonicalSchema,
  language: Language,
  country: Country,
  runId: string
): string {
  const schemaJson = JSON.stringify(schema, null, 2);
  const requiredFields = schema.required ?? [];

  return [
    `## Task`,
    `Generate a complete enterprise knowledge document for:`,
    `- Industry: ${industry.name} (${industry.id})`,
    `- Department: ${department.name} (${department.id})`,
    `- Topic: ${topic.name} (${topic.id})`,
    `- Schema Type: ${topic.schemaType}`,
    `- Language: ${language.name} (${language.code})`,
    `- Country: ${country.name} (${country.code})`,
    `- Priority: ${topic.priority}`,
    '',
    `## Schema`,
    `The document must conform to this JSON Schema:`,
    '```json',
    schemaJson,
    '```',
    '',
    `## Required Fields`,
    `These fields MUST be present and non-null:`,
    requiredFields.map((f) => `- \`${f}\``).join('\n'),
    '',
    `## Fixed Values (do not change these)`,
    `- \`schema_version\`: "1.0.0"`,
    `- \`industry\`: "${industry.id}"`,
    `- \`department\`: "${department.id}"`,
    `- \`language\`: "${language.code}"`,
    `- \`country\`: "${country.code}"`,
    `- \`priority\`: "${topic.priority}"`,
    `- \`version\`: "1.0.0"`,
    `- \`status\`: "draft"`,
    '',
    `## Generated Values (you must generate these)`,
    `- \`id\`: a valid UUID v4`,
    `- \`title\`: a specific, descriptive title for "${topic.name}" in ${industry.name} context`,
    `- \`tags\`: 3-8 relevant tags from [${topic.tags.concat([industry.id, department.id]).join(', ')}]`,
    `- \`owner\`: use format "operations@organization.com" (generic role-based email)`,
    `- \`last_updated\`: current ISO 8601 timestamp`,
    `- All schema-specific fields: populate with substantive, industry-accurate content`,
    '',
    `## Content Standard`,
    `- Write as a professional enterprise document, not a template`,
    `- Use ${industry.name}-specific terminology and real operational context`,
    `- Content must be usable in a real ${country.name} ${industry.name} business`,
    `- Minimum content: every required field must have meaningful, complete content`,
    `- Do NOT use placeholder text like "[INSERT...]", "TBD", "Lorem ipsum"`,
    '',
    `## Metadata`,
    `- Run ID: ${runId}`,
    `- Generated for: Eunoia AI OS Knowledge Cloud / Demo Enterprise Pack v1`,
    '',
    `Respond with ONLY the JSON document. No other text.`,
  ].join('\n');
}

// ─── Prompt assembly ──────────────────────────────────────────────────────────

/**
 * Build a complete, provider-agnostic LLM prompt for a generation context.
 */
export function buildPrompt(context: GenerationContext): LLMPrompt {
  const { industry, department, topic, language, country, schema, config, runId } = context;

  return {
    system: buildSystemPrompt(industry, department, language, country),
    user: buildUserPrompt(industry, department, topic, schema, language, country, runId),
    schemaContext: schema,
    context: {
      industry: industry.id,
      department: department.id,
      topic: topic.id,
      language: language.code,
      country: country.code,
    },
    parameters: {
      temperature: config.generation.temperature,
      maxTokens: config.generation.maxTokens,
      responseFormat: 'json',
    },
  };
}

/**
 * Build a repair prompt when initial generation produced invalid JSON or failed validation.
 */
export function buildRepairPrompt(
  context: GenerationContext,
  failedOutput: string,
  errors: string[]
): LLMPrompt {
  const base = buildPrompt(context);

  const repairUser = [
    `## Previous Attempt Failed`,
    `The previous generation attempt produced invalid output. Fix it.`,
    '',
    `## Validation Errors`,
    errors.map((e) => `- ${e}`).join('\n'),
    '',
    `## Previous Output (may be malformed)`,
    '```',
    failedOutput.slice(0, 4000),
    '```',
    '',
    `## Your Task`,
    `Return a corrected JSON document that:`,
    `1. Fixes all validation errors listed above`,
    `2. Conforms exactly to the schema`,
    `3. Contains no placeholder text`,
    '',
    base.user,
  ].join('\n');

  return { ...base, user: repairUser };
}

/** Serialize a prompt to a loggable summary string. */
export function promptSummary(prompt: LLMPrompt): string {
  return JSON.stringify({
    context: prompt.context,
    systemLength: prompt.system.length,
    userLength: prompt.user.length,
    parameters: prompt.parameters,
  });
}
