import type { KnowledgeEntity } from "../types";
import { normalizeWhitespace } from "../normalizers/text";
import { runRules, type ExtractionRule } from "./rules/index";
import { PATTERN_RULES } from "./rules/pattern";
import { DICTIONARY_RULES } from "./rules/dictionary";
import { HEURISTIC_RULES } from "./rules/heuristic";

// ─── Ordered rule set ─────────────────────────────────────────────────────────
// PatternRules (priority 1–3) → DictionaryRules (priority 2) → HeuristicRules (priority 5)
// Lower priority number = runs first; confidence of first match wins on conflict.

const ALL_RULES: readonly ExtractionRule[] = [
  ...PATTERN_RULES,
  ...DICTIONARY_RULES,
  ...HEURISTIC_RULES,
];

/**
 * Extracts named entities from raw text using a three-tier rule engine:
 *   1. PatternRules  — high-precision regex (Email, Phone, URL, Company+suffix)
 *   2. DictionaryRules — known company brands + technology/platform/tool terms
 *   3. HeuristicRules — context-based inference (Person two-cap-word heuristic)
 *
 * Returns entities sorted by confidence (desc), then occurrences (desc).
 * No external service or embedding is invoked.
 */
export function extractEntities(text: string): KnowledgeEntity[] {
  return runRules(normalizeWhitespace(text), ALL_RULES);
}

export { ALL_RULES as ENTITY_RULES };
