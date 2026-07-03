import type { KnowledgeEntity, KnowledgeEntityType } from "../../types";
import type { ExtractionRule } from "./index";

// ─── Pattern rules (regex-based, high precision) ──────────────────────────────

interface RawPatternRule {
  readonly type: KnowledgeEntityType;
  readonly pattern: RegExp;
  readonly confidence: number;
  readonly priority: number;
}

const RAW_PATTERNS: readonly RawPatternRule[] = [
  {
    type: "Email",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    confidence: 0.99,
    priority: 1,
  },
  {
    type: "Website",
    pattern:
      /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,}\b[-a-zA-Z0-9@:%_+.~#?&/=]*/g,
    confidence: 0.99,
    priority: 1,
  },
  {
    type: "Phone",
    pattern:
      /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    confidence: 0.9,
    priority: 2,
  },
  {
    // Requires a recognised legal suffix — dramatically reduces false positives
    type: "Company",
    pattern:
      /\b[A-Z][A-Za-z0-9&'.-]*(?:\s+[A-Z][A-Za-z0-9&'.-]*)*\s+(?:Ltd\.?|LLC|LLP|Inc\.?|Corp\.?|GmbH|Pty\.?|Co\.|S\.A\.|Limited|Incorporated|Corporation|Group|Holdings|International|Ventures|Studios|Solutions|Technologies|Services|Consulting|Agency|Partners|Associates)\b/g,
    confidence: 0.85,
    priority: 3,
  },
];

function buildPatternRule(raw: RawPatternRule): ExtractionRule {
  return {
    name: `pattern:${raw.type.toLowerCase()}`,
    ruleType: "pattern",
    priority: raw.priority,
    apply(text): KnowledgeEntity[] {
      const re = new RegExp(raw.pattern.source, raw.pattern.flags);
      const entities: KnowledgeEntity[] = [];
      let match: RegExpExecArray | null;
      while ((match = re.exec(text)) !== null) {
        const value = match[0].trim();
        entities.push({
          type: raw.type,
          value,
          normalized: value.toLowerCase(),
          confidence: raw.confidence,
          occurrences: 1,
        });
      }
      return entities;
    },
  };
}

export const PATTERN_RULES: readonly ExtractionRule[] =
  RAW_PATTERNS.map(buildPatternRule);
