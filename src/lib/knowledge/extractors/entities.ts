import type { KnowledgeEntity, KnowledgeEntityType } from "../types";
import { normalizeWhitespace } from "../normalizers/text";

// ─── Pattern-based extractors ────────────────────────────────────────────────

interface PatternRule {
  readonly type: KnowledgeEntityType;
  readonly pattern: RegExp;
  readonly confidence: number;
}

const PATTERN_RULES: readonly PatternRule[] = [
  {
    type: "Email",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    confidence: 0.99,
  },
  {
    type: "Phone",
    pattern:
      /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    confidence: 0.9,
  },
  {
    type: "Website",
    pattern:
      /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,}\b[-a-zA-Z0-9@:%_+.~#?&/=]*/g,
    confidence: 0.99,
  },
  {
    // Requires a recognised legal suffix — dramatically reduces false positives
    type: "Company",
    pattern:
      /\b[A-Z][A-Za-z0-9&'.-]*(?:\s+[A-Z][A-Za-z0-9&'.-]*)*\s+(?:Ltd\.?|LLC|LLP|Inc\.?|Corp\.?|GmbH|Pty\.?|Co\.|S\.A\.|Limited|Incorporated|Corporation|Group|Holdings|International|Ventures|Studios|Solutions|Technologies|Services|Consulting|Agency|Partners|Associates)\b/g,
    confidence: 0.85,
  },
  {
    // Two consecutive Title-Case words not inside a URL or after common punctuation
    type: "Person",
    pattern: /(?<!\S)([A-Z][a-z]{1,20})\s+([A-Z][a-z]{1,20})(?!\.[a-z])/g,
    confidence: 0.55,
  },
];

// ─── Keyword-based extractors ─────────────────────────────────────────────────

const TECHNOLOGY_TERMS = new Map<string, KnowledgeEntityType>([
  // Technologies
  ["react", "Technology"],
  ["nextjs", "Technology"],
  ["next.js", "Technology"],
  ["typescript", "Technology"],
  ["javascript", "Technology"],
  ["python", "Technology"],
  ["nodejs", "Technology"],
  ["node.js", "Technology"],
  ["graphql", "Technology"],
  ["rest", "Technology"],
  ["grpc", "Technology"],
  ["websocket", "Technology"],
  // Databases
  ["postgresql", "Technology"],
  ["postgres", "Technology"],
  ["mongodb", "Technology"],
  ["redis", "Technology"],
  ["elasticsearch", "Technology"],
  ["mysql", "Technology"],
  ["sqlite", "Technology"],
  // AI / ML
  ["openai", "Technology"],
  ["gpt", "Technology"],
  ["gpt-4", "Technology"],
  ["claude", "Technology"],
  ["anthropic", "Technology"],
  ["langchain", "Technology"],
  ["pinecone", "Technology"],
  ["weaviate", "Technology"],
  ["qdrant", "Technology"],
  ["huggingface", "Technology"],
  // Cloud / infra
  ["aws", "Technology"],
  ["gcp", "Technology"],
  ["azure", "Technology"],
  ["docker", "Technology"],
  ["kubernetes", "Technology"],
  ["terraform", "Technology"],
  ["cloudflare", "Technology"],
  // Platforms
  ["vercel", "Platform"],
  ["supabase", "Platform"],
  ["firebase", "Platform"],
  ["netlify", "Platform"],
  ["heroku", "Platform"],
  ["railway", "Platform"],
  ["shopify", "Platform"],
  ["wordpress", "Platform"],
  ["webflow", "Platform"],
  ["framer", "Platform"],
  // Tools
  ["github", "Tool"],
  ["gitlab", "Tool"],
  ["jira", "Tool"],
  ["notion", "Tool"],
  ["slack", "Tool"],
  ["figma", "Tool"],
  ["linear", "Tool"],
  ["hubspot", "Tool"],
  ["salesforce", "Tool"],
  ["zapier", "Tool"],
  ["make", "Tool"],
  ["airtable", "Tool"],
  ["stripe", "Tool"],
  ["twilio", "Tool"],
  ["sendgrid", "Tool"],
  ["resend", "Tool"],
]);

// Proper nouns that the Person pattern commonly misidentifies
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

function extractPatternEntities(text: string): Map<string, KnowledgeEntity> {
  const accumulated = new Map<string, KnowledgeEntity>();

  for (const { type, pattern, confidence } of PATTERN_RULES) {
    const re = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = re.exec(text)) !== null) {
      const value = match[0].trim();

      // Filter Person false-positives
      if (type === "Person" && PERSON_DENYLIST.has(value)) continue;

      const key = `${type}::${value.toLowerCase()}`;
      const existing = accumulated.get(key);
      if (existing) {
        accumulated.set(key, {
          ...existing,
          occurrences: existing.occurrences + 1,
        });
      } else {
        accumulated.set(key, {
          type,
          value,
          normalized: value.toLowerCase(),
          confidence,
          occurrences: 1,
        });
      }
    }
  }

  return accumulated;
}

function extractKeywordEntities(
  text: string,
  existing: Map<string, KnowledgeEntity>
): Map<string, KnowledgeEntity> {
  const lower = text.toLowerCase();
  const result = new Map(existing);

  for (const [keyword, entityType] of TECHNOLOGY_TERMS) {
    const key = `${entityType}::${keyword}`;
    if (result.has(key)) continue;

    // Word-boundary search (simple: surrounded by non-word characters)
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Exclude only word-chars and hyphens (not ".") so "supabase." and "react," match
    const re = new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, "gi");
    const matches = lower.match(re);
    if (!matches) continue;

    result.set(key, {
      type: entityType,
      value: keyword,
      normalized: keyword,
      confidence: 0.95,
      occurrences: matches.length,
    });
  }

  return result;
}

/**
 * Extracts named entities from raw text using pattern matching and a
 * curated technology keyword dictionary.
 *
 * Returns entities sorted by confidence (descending), then occurrences.
 * No external service is called.
 */
export function extractEntities(text: string): KnowledgeEntity[] {
  const cleaned = normalizeWhitespace(text);
  const patternMap = extractPatternEntities(cleaned);
  const allMap = extractKeywordEntities(cleaned, patternMap);

  return Array.from(allMap.values()).sort(
    (a, b) =>
      b.confidence - a.confidence || b.occurrences - a.occurrences
  );
}
