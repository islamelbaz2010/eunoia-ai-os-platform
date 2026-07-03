import type { KnowledgeEntity } from "../../types";

// ─── Rule engine ──────────────────────────────────────────────────────────────

export type ExtractionRuleType = "pattern" | "dictionary" | "heuristic";

export interface ExtractionRule {
  readonly name: string;
  readonly ruleType: ExtractionRuleType;
  /** Lower value = higher priority (runs first). Deduplication favours the first seen. */
  readonly priority: number;
  apply(text: string): KnowledgeEntity[];
}

/**
 * Runs a set of ExtractionRules against text in priority order.
 * Entities with the same (type, normalized) key are merged: the first rule's
 * confidence wins; occurrence counts are summed across all rules.
 */
export function runRules(
  text: string,
  rules: readonly ExtractionRule[]
): KnowledgeEntity[] {
  const accumulated = new Map<string, KnowledgeEntity>();

  for (const rule of [...rules].sort((a, b) => a.priority - b.priority)) {
    for (const entity of rule.apply(text)) {
      const key = `${entity.type}::${entity.normalized}`;
      const existing = accumulated.get(key);
      if (existing) {
        accumulated.set(key, {
          ...existing,
          occurrences: existing.occurrences + entity.occurrences,
        });
      } else {
        accumulated.set(key, entity);
      }
    }
  }

  return Array.from(accumulated.values()).sort(
    (a, b) => b.confidence - a.confidence || b.occurrences - a.occurrences
  );
}
