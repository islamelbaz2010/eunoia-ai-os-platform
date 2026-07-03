import type { KnowledgeEntity } from "../../types";
import type { ExtractionRule } from "./index";

// ─── Person heuristic ─────────────────────────────────────────────────────────
// Two consecutive Title-Case words is a low-confidence heuristic.
// A curated deny-list suppresses the most common false positives.

const PERSON_PATTERN =
  /(?<!\S)([A-Z][a-z]{1,20})\s+([A-Z][a-z]{1,20})(?!\.[a-z])/g;

const PERSON_CONFIDENCE = 0.55;

const PERSON_DENYLIST = new Set([
  "New York",
  "Los Angeles",
  "San Francisco",
  "United States",
  "United Kingdom",
  "North America",
  "South America",
  "Middle East",
  "South East",
  "Visual Studio",
  "Mac Os",
  "Windows Server",
  "Open Source",
  "Real Estate",
  "Social Media",
  "Machine Learning",
  "Artificial Intelligence",
]);

export const PERSON_RULE: ExtractionRule = {
  name: "heuristic:person",
  ruleType: "heuristic",
  priority: 5,
  apply(text): KnowledgeEntity[] {
    const re = new RegExp(PERSON_PATTERN.source, PERSON_PATTERN.flags);
    const entities: KnowledgeEntity[] = [];
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const value = match[0].trim();
      if (PERSON_DENYLIST.has(value)) continue;
      entities.push({
        type: "Person",
        value,
        normalized: value.toLowerCase(),
        confidence: PERSON_CONFIDENCE,
        occurrences: 1,
      });
    }
    return entities;
  },
};

export const HEURISTIC_RULES: readonly ExtractionRule[] = [PERSON_RULE];
