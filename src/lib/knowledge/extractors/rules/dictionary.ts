import type { KnowledgeEntity, KnowledgeEntityType } from "../../types";
import type { ExtractionRule } from "./index";

// ─── Technology / Platform / Tool dictionary ──────────────────────────────────

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

// ─── Known company dictionary (no legal suffix required) ─────────────────────
// Covers widely-recognised brands where a suffix would be redundant or wrong.
// Confidence is lower (0.90) than suffix-based detection to reflect heuristic nature.

const KNOWN_COMPANIES = new Map<string, KnowledgeEntityType>([
  // Eunoia ecosystem
  ["eunoia", "Company"],
  ["radix", "Company"],
  // Big tech
  ["google", "Company"],
  ["apple", "Company"],
  ["microsoft", "Company"],
  ["meta", "Company"],
  ["amazon", "Company"],
  ["netflix", "Company"],
  ["tesla", "Company"],
  ["spotify", "Company"],
  ["airbnb", "Company"],
  ["uber", "Company"],
  ["twitter", "Company"],
  ["linkedin", "Company"],
  ["paypal", "Company"],
  ["samsung", "Company"],
  ["oracle", "Company"],
  ["ibm", "Company"],
  ["adobe", "Company"],
  ["nvidia", "Company"],
]);

function buildDictionaryRule(
  name: string,
  terms: Map<string, KnowledgeEntityType>,
  confidence: number,
  priority: number
): ExtractionRule {
  return {
    name,
    ruleType: "dictionary",
    priority,
    apply(text): KnowledgeEntity[] {
      const lower = text.toLowerCase();
      const entities: KnowledgeEntity[] = [];

      for (const [keyword, type] of terms) {
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Exclude word-chars and hyphens from boundaries (not ".") so
        // "supabase." and "react," still match
        const re = new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, "gi");
        const matches = lower.match(re);
        if (!matches) continue;

        entities.push({
          type,
          value: keyword,
          normalized: keyword,
          confidence,
          occurrences: matches.length,
        });
      }

      return entities;
    },
  };
}

export const TECHNOLOGY_RULE: ExtractionRule = buildDictionaryRule(
  "dictionary:technology",
  TECHNOLOGY_TERMS,
  0.95,
  2
);

export const KNOWN_COMPANY_RULE: ExtractionRule = buildDictionaryRule(
  "dictionary:known-companies",
  KNOWN_COMPANIES,
  0.9,
  2
);

export const DICTIONARY_RULES: readonly ExtractionRule[] = [
  KNOWN_COMPANY_RULE,
  TECHNOLOGY_RULE,
];
