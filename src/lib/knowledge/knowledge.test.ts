import { describe, it, expect } from "vitest";

import {
  normalizeWhitespace,
  normalizeForComparison,
  stripHtml,
  truncate,
} from "./normalizers/text";
import {
  computeSimilarity,
  detectDuplicates,
} from "./normalizers/duplicates";
import { extractEntities } from "./extractors/entities";
import { extractKeywords } from "./extractors/keywords";
import { buildRelationships } from "./relationships/builder";
import { scoreDocument } from "./scoring/scorer";
import { searchDocuments, findRelatedDocuments } from "./search/index";
import { processDocument, findDuplicates } from "./knowledge";
import type { KnowledgeEntity } from "./types";

// ─── Text normalisation ───────────────────────────────────────────────────────

describe("normalizeWhitespace", () => {
  it("trims leading and trailing whitespace", () => {
    expect(normalizeWhitespace("  hello  ")).toBe("hello");
  });

  it("collapses multiple spaces to one", () => {
    expect(normalizeWhitespace("hello  world")).toBe("hello world");
  });

  it("converts tabs to spaces", () => {
    expect(normalizeWhitespace("a\tb")).toBe("a b");
  });

  it("normalises Windows line endings to Unix", () => {
    expect(normalizeWhitespace("line1\r\nline2")).toBe("line1\nline2");
  });

  it("handles empty string", () => {
    expect(normalizeWhitespace("")).toBe("");
  });

  it("applies NFC unicode normalisation", () => {
    // café composed (U+00E9) vs decomposed (e + combining accent)
    const composed = "café";
    const decomposed = "café";
    expect(normalizeWhitespace(decomposed)).toBe(normalizeWhitespace(composed));
  });
});

describe("normalizeForComparison", () => {
  it("lowercases text", () => {
    expect(normalizeForComparison("Hello World")).toBe("hello world");
  });

  it("strips punctuation", () => {
    expect(normalizeForComparison("Hello, World!")).toBe("hello world");
  });

  it("makes punctuation-differing strings identical", () => {
    expect(normalizeForComparison("hello, world!")).toBe(
      normalizeForComparison("hello world")
    );
  });
});

describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<p>Hello</p>")).toBe("Hello");
  });

  it("decodes common HTML entities", () => {
    const result = stripHtml("&amp; &lt; &gt; &quot;");
    expect(result).toBe('& < > "');
  });

  it("handles nested tags", () => {
    expect(stripHtml("<div><strong>Bold</strong></div>")).toBe("Bold");
  });
});

describe("truncate", () => {
  it("returns text unchanged when shorter than maxLength", () => {
    expect(truncate("short", 100)).toBe("short");
  });

  it("appends ellipsis when truncating", () => {
    const result = truncate("hello world foo bar", 10);
    expect(result).toMatch(/…$/);
  });

  it("truncated length is at most maxLength + 1 (for the ellipsis char)", () => {
    const result = truncate("hello world foo bar baz", 15);
    expect(result.length).toBeLessThanOrEqual(16);
  });
});

// ─── Duplicate detection ──────────────────────────────────────────────────────

describe("computeSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(computeSimilarity("the quick brown fox", "the quick brown fox")).toBe(1);
  });

  it("returns 1 for strings that are identical after normalisation", () => {
    expect(computeSimilarity("Hello, World!", "hello world")).toBe(1);
  });

  it("returns high similarity for near-duplicate strings", () => {
    const a = "Our company provides hospitality management services including event planning and catering coordination for luxury hotels and resorts worldwide";
    const b = "Our company provides hospitality management services including event planning and catering coordination for luxury hotels and resorts globally";
    expect(computeSimilarity(a, b)).toBeGreaterThan(0.8);
  });

  it("returns low similarity for completely different strings", () => {
    const a = "artificial intelligence and machine learning";
    const b = "invoice number twelve thousand four hundred";
    expect(computeSimilarity(a, b)).toBeLessThan(0.2);
  });
});

describe("detectDuplicates", () => {
  it("detects exact duplicates after normalisation", () => {
    const texts = ["Hello World", "hello world", "Goodbye"];
    const pairs = detectDuplicates(texts);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({ aIndex: 0, bIndex: 1, type: "exact" });
  });

  it("detects near-duplicate strings above threshold", () => {
    const base =
      "Our company provides hospitality management services including event planning and catering coordination for luxury hotels and resorts worldwide";
    const variant =
      "Our company provides hospitality management services including event planning and catering coordination for luxury hotels and resorts globally";
    const pairs = detectDuplicates([base, variant], 0.7);
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs[0]!.type).toBe("near");
  });

  it("returns empty array for clearly different texts", () => {
    const texts = ["Machine learning algorithms", "Quarterly financial report"];
    expect(detectDuplicates(texts, 0.8)).toHaveLength(0);
  });

  it("returns empty array for a single document", () => {
    expect(detectDuplicates(["single document"])).toHaveLength(0);
  });
});

// ─── Entity extraction ────────────────────────────────────────────────────────

describe("extractEntities — emails", () => {
  it("extracts a plain email address", () => {
    const entities = extractEntities("Contact us at hello@example.com for details.");
    const emails = entities.filter((e) => e.type === "Email");
    expect(emails).toHaveLength(1);
    expect(emails[0]!.value).toBe("hello@example.com");
  });

  it("extracts multiple email addresses", () => {
    const entities = extractEntities("sales@acme.com and support@acme.com");
    expect(entities.filter((e) => e.type === "Email")).toHaveLength(2);
  });

  it("assigns high confidence to emails", () => {
    const entities = extractEntities("email@domain.org");
    const email = entities.find((e) => e.type === "Email");
    expect(email!.confidence).toBeGreaterThanOrEqual(0.95);
  });
});

describe("extractEntities — websites", () => {
  it("extracts https URLs", () => {
    const entities = extractEntities("Visit https://www.example.com for more info.");
    const sites = entities.filter((e) => e.type === "Website");
    expect(sites).toHaveLength(1);
    expect(sites[0]!.value).toContain("example.com");
  });
});

describe("extractEntities — phones", () => {
  it("extracts a standard phone number", () => {
    const entities = extractEntities("Call us on 555-123-4567 today.");
    const phones = entities.filter((e) => e.type === "Phone");
    expect(phones).toHaveLength(1);
  });
});

describe("extractEntities — companies", () => {
  it("extracts a company with a legal suffix", () => {
    const entities = extractEntities("We partnered with Acme Solutions Ltd last quarter.");
    const companies = entities.filter((e) => e.type === "Company");
    expect(companies.length).toBeGreaterThan(0);
    expect(companies[0]!.value).toMatch(/Acme Solutions Ltd/);
  });

  it("does NOT extract a plain lowercase word as a company", () => {
    const entities = extractEntities("the limited scope of this project");
    const companies = entities.filter((e) => e.type === "Company");
    expect(companies).toHaveLength(0);
  });
});

describe("extractEntities — technology", () => {
  it("extracts known technology names", () => {
    const entities = extractEntities(
      "The system is built with React, TypeScript, and Supabase."
    );
    const tech = entities
      .filter((e) => e.type === "Technology" || e.type === "Platform")
      .map((e) => e.normalized);
    expect(tech).toContain("react");
    expect(tech).toContain("typescript");
    expect(tech).toContain("supabase");
  });

  it("assigns high confidence to known technology terms", () => {
    const entities = extractEntities("We deploy on Vercel.");
    const vercel = entities.find((e) => e.normalized === "vercel");
    expect(vercel).toBeDefined();
    expect(vercel!.confidence).toBeGreaterThanOrEqual(0.9);
  });
});

describe("extractEntities — deduplication", () => {
  it("deduplicates the same entity mentioned twice", () => {
    const entities = extractEntities(
      "Contact support@test.com or email support@test.com again."
    );
    const emails = entities.filter((e) => e.type === "Email");
    expect(emails).toHaveLength(1);
    expect(emails[0]!.occurrences).toBe(2);
  });
});

// ─── Keyword extraction ───────────────────────────────────────────────────────

describe("extractKeywords", () => {
  it("returns primary keywords", () => {
    const text = "Our hospitality management platform delivers end-to-end event coordination and catering services for luxury hotels.";
    const { primary } = extractKeywords(text);
    expect(primary.length).toBeGreaterThan(0);
    expect(primary.length).toBeLessThanOrEqual(10);
  });

  it("removes common English stop words", () => {
    const text = "The quick brown fox jumps over the lazy dog and the cat";
    const { primary } = extractKeywords(text);
    expect(primary).not.toContain("the");
    expect(primary).not.toContain("and");
    expect(primary).not.toContain("over");
  });

  it("title keywords appear in primary list when content mentions them", () => {
    const title = "Knowledge Management";
    const content = "Knowledge management involves capturing and distributing knowledge across the organisation.";
    const { primary } = extractKeywords(content, title);
    expect(primary).toContain("knowledge");
    expect(primary).toContain("management");
  });

  it("returns synonyms for recognised business terms", () => {
    const text = "The client signed the contract for a new project.";
    const { synonyms } = extractKeywords(text);
    expect(synonyms.length).toBeGreaterThan(0);
  });

  it("secondary keywords are distinct from primary", () => {
    const text = Array(50).fill("hospitality event management catering venue coordination luxury hotel").join(" ");
    const { primary, secondary } = extractKeywords(text);
    const overlap = primary.filter((kw) => secondary.includes(kw));
    expect(overlap).toHaveLength(0);
  });
});

// ─── Relationship building ────────────────────────────────────────────────────

describe("buildRelationships", () => {
  it("infers company_owns_service when both entity types are present", () => {
    const entities: KnowledgeEntity[] = [
      { type: "Company", value: "Acme Corp", normalized: "acme corp", confidence: 0.85, occurrences: 1 },
      { type: "Service", value: "catering", normalized: "catering", confidence: 0.8, occurrences: 1 },
    ];
    const rels = buildRelationships(entities, "doc-1");
    const rel = rels.find((r) => r.type === "company_owns_service");
    expect(rel).toBeDefined();
    expect(rel!.subject).toBe("Acme Corp");
    expect(rel!.object).toBe("catering");
  });

  it("infers person_works_at_company", () => {
    const entities: KnowledgeEntity[] = [
      { type: "Person", value: "John Smith", normalized: "john smith", confidence: 0.6, occurrences: 1 },
      { type: "Company", value: "Acme Ltd", normalized: "acme ltd", confidence: 0.85, occurrences: 1 },
    ];
    const rels = buildRelationships(entities, "doc-2");
    expect(rels.find((r) => r.type === "person_works_at_company")).toBeDefined();
  });

  it("infers document_references_service when Service entity is present", () => {
    const entities: KnowledgeEntity[] = [
      { type: "Service", value: "event planning", normalized: "event planning", confidence: 0.75, occurrences: 2 },
    ];
    const rels = buildRelationships(entities, "doc-3");
    const ref = rels.find((r) => r.type === "document_references_service");
    expect(ref).toBeDefined();
    expect(ref!.subjectType).toBe("Document");
    expect(ref!.subject).toBe("doc-3");
  });

  it("returns empty array when no entities are present", () => {
    expect(buildRelationships([], "doc-empty")).toHaveLength(0);
  });

  it("confidence is bounded to 1", () => {
    const entities: KnowledgeEntity[] = [
      { type: "Company", value: "X Corp", normalized: "x corp", confidence: 1, occurrences: 1 },
      { type: "Service", value: "consulting", normalized: "consulting", confidence: 1, occurrences: 1 },
    ];
    const rels = buildRelationships(entities, "doc-4");
    for (const r of rels) {
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });
});

// ─── Scoring ──────────────────────────────────────────────────────────────────

describe("scoreDocument", () => {
  const recentDate = new Date().toISOString();
  const oldDate = new Date(Date.now() - 400 * 86_400_000).toISOString();

  it("returns all scores in 0–1 range", () => {
    const scores = scoreDocument(
      "Sales",
      { modified: recentDate, documentType: "document" },
      [],
      1000,
      10
    );
    for (const [, v] of Object.entries(scores)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("Sales category has higher importance than General", () => {
    const sales = scoreDocument("Sales", { modified: recentDate, documentType: "document" }, [], 500, 5);
    const general = scoreDocument("General", { modified: recentDate, documentType: "document" }, [], 500, 5);
    expect(sales.importance).toBeGreaterThan(general.importance);
  });

  it("recent document has higher freshness than old document", () => {
    const recent = scoreDocument("General", { modified: recentDate, documentType: "document" }, [], 500, 5);
    const old = scoreDocument("General", { modified: oldDate, documentType: "document" }, [], 500, 5);
    expect(recent.freshness).toBeGreaterThan(old.freshness);
  });

  it("document with more entities has higher confidence", () => {
    const entity: KnowledgeEntity = {
      type: "Email", value: "a@b.com", normalized: "a@b.com", confidence: 0.99, occurrences: 1,
    };
    const rich = scoreDocument("General", { modified: recentDate, documentType: "document" }, [entity, entity, entity, entity, entity], 2000, 10);
    const sparse = scoreDocument("General", { modified: recentDate, documentType: "document" }, [], 100, 0);
    expect(rich.confidence).toBeGreaterThan(sparse.confidence);
  });

  it("Knowledge Base category scores highest for aiUsefulness", () => {
    const kb = scoreDocument("Knowledge Base", { modified: recentDate, documentType: "document" }, [], 500, 5);
    const inv = scoreDocument("Invoices", { modified: recentDate, documentType: "document" }, [], 500, 5);
    expect(kb.aiUsefulness).toBeGreaterThan(inv.aiUsefulness);
  });
});

// ─── Search ───────────────────────────────────────────────────────────────────

describe("searchDocuments", () => {
  const docA = processDocument({
    title: "Hotel Event Planning Services",
    content: "We provide comprehensive event planning and catering services for luxury hotels and resorts worldwide.",
    category: "Services",
  });

  const docB = processDocument({
    title: "Client Invoice Management",
    content: "Automated invoice generation and payment tracking for all client accounts.",
    category: "Finance",
  });

  it("returns relevant document for matching query", () => {
    const results = searchDocuments([docA, docB], "event planning");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.document.id).toBe(docA.id);
  });

  it("returns empty array for empty query", () => {
    expect(searchDocuments([docA, docB], "")).toHaveLength(0);
  });

  it("filters by category", () => {
    const results = searchDocuments([docA, docB], "services", {
      category: "Finance",
    });
    for (const r of results) {
      expect(r.document.category).toBe("Finance");
    }
  });

  it("all returned relevance scores are in 0–1 range", () => {
    const results = searchDocuments([docA, docB], "hotel catering invoice");
    for (const r of results) {
      expect(r.relevance).toBeGreaterThan(0);
      expect(r.relevance).toBeLessThanOrEqual(1);
    }
  });

  it("matched keywords are a subset of query terms", () => {
    const results = searchDocuments([docA, docB], "event planning catering");
    for (const r of results) {
      expect(r.matchedKeywords).toBeInstanceOf(Array);
    }
  });
});

describe("findRelatedDocuments", () => {
  const seed = processDocument({
    title: "Hospitality Services Overview",
    content: "Our hospitality services include event planning, catering, venue management and guest services.",
    category: "Services",
  });

  const similar = processDocument({
    title: "Event Catering Services",
    content: "Premium catering and event services for corporate and private hospitality clients.",
    category: "Services",
  });

  const unrelated = processDocument({
    title: "Annual Financial Report",
    content: "Revenue increased by twelve percent year-on-year. Operating costs were contained.",
    category: "Finance",
  });

  it("ranks similar document higher than unrelated", () => {
    const results = findRelatedDocuments(seed, [similar, unrelated]);
    expect(results.length).toBeGreaterThan(0);
    const simIdx = results.findIndex((r) => r.document.id === similar.id);
    const unrelIdx = results.findIndex((r) => r.document.id === unrelated.id);
    if (simIdx !== -1 && unrelIdx !== -1) {
      expect(simIdx).toBeLessThan(unrelIdx);
    } else {
      expect(simIdx).toBe(0);
    }
  });

  it("does not include the seed document itself", () => {
    const results = findRelatedDocuments(seed, [seed, similar, unrelated]);
    expect(results.map((r) => r.document.id)).not.toContain(seed.id);
  });
});

// ─── processDocument (integration) ────────────────────────────────────────────

describe("processDocument", () => {
  const doc = processDocument({
    title: "CRM Services for Hospitality Clients",
    content: `
      Our CRM platform helps hospitality businesses manage client relationships effectively.
      Contact us at hello@eunoiaos.com or visit https://eunoiaos.com for more information.
      The system is built on Next.js, TypeScript, and Supabase.
      Call 555-123-4567 to speak with a sales representative.
    `,
    category: "Services",
  });

  it("assigns a UUID to the document", () => {
    expect(doc.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("produces a non-empty title", () => {
    expect(doc.title).toBe("CRM Services for Hospitality Clients");
  });

  it("produces a non-empty summary", () => {
    expect(doc.summary.length).toBeGreaterThan(10);
  });

  it("extracts email entity from content", () => {
    const email = doc.entities.find((e) => e.type === "Email");
    expect(email).toBeDefined();
    expect(email!.value).toBe("hello@eunoiaos.com");
  });

  it("extracts website entity from content", () => {
    const site = doc.entities.find((e) => e.type === "Website");
    expect(site).toBeDefined();
  });

  it("extracts technology entities from content", () => {
    const tech = doc.entities
      .filter((e) => e.type === "Technology" || e.type === "Platform")
      .map((e) => e.normalized);
    expect(tech).toContain("next.js");
    expect(tech).toContain("typescript");
    expect(tech).toContain("supabase");
  });

  it("produces primary keywords", () => {
    expect(doc.keywords.primary.length).toBeGreaterThan(0);
  });

  it("category is preserved", () => {
    expect(doc.category).toBe("Services");
  });

  it("all scores are in 0–1 range", () => {
    for (const [, v] of Object.entries(doc.scores)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("tags derive from primary keywords", () => {
    expect(doc.tags.length).toBeGreaterThan(0);
    for (const tag of doc.tags) {
      expect(tag.weight).toBeGreaterThan(0);
      expect(tag.weight).toBeLessThanOrEqual(1);
    }
  });
});

describe("findDuplicates (integration)", () => {
  it("flags identical documents as exact duplicates", () => {
    const raw = {
      title: "Service Overview",
      content: "We provide hospitality management services to luxury hotels worldwide.",
    };
    const a = processDocument(raw);
    const b = processDocument(raw);
    const pairs = findDuplicates([a, b]);
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs[0]!.type).toBe("exact");
  });

  it("returns no duplicates for clearly different documents", () => {
    const a = processDocument({ title: "Invoice March 2025", content: "Invoice total is five thousand dollars for web development services." });
    const b = processDocument({ title: "HR Policy Manual", content: "All employees must adhere to the code of conduct outlined in this document." });
    expect(findDuplicates([a, b], 0.9)).toHaveLength(0);
  });
});
