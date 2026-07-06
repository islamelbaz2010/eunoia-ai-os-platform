// ─── Classifier Module ────────────────────────────────────────────────────────────

import type { KnowledgeCategory } from "../../types";
import type { FileMetadata, ClassifiedAsset, ClassifierOptions } from "../types";

export { AssetClassifier };

/**
 * Classifier for automatically categorizing assets into knowledge categories.
 */
class AssetClassifier {
  private readonly categoryKeywords: Map<KnowledgeCategory, readonly string[]>;
  private readonly defaultOptions: ClassifierOptions;

  constructor(options: ClassifierOptions = {}) {
    this.defaultOptions = {
      threshold: 0.3,
      useKeywords: true,
      usePathHints: true,
      ...options,
    };

    this.categoryKeywords = this.initializeCategoryKeywords();
  }

  /**
   * Classify an asset based on its content and metadata.
   */
  classify(
    metadata: FileMetadata,
    content: string,
    options: ClassifierOptions = {}
  ): ClassifiedAsset {
    const opts = { ...this.defaultOptions, ...options };
    const scores = this.calculateScores(metadata, content, opts);
    const topCategory = this.getTopCategory(scores);
    const confidence = scores.get(topCategory) || 0;

    return {
      metadata,
      content,
      category: topCategory,
      confidence,
      error: null,
    };
  }

  /**
   * Calculate category scores based on content and metadata.
   */
  private calculateScores(
    metadata: FileMetadata,
    content: string,
    options: ClassifierOptions
  ): Map<KnowledgeCategory, number> {
    const scores = new Map<KnowledgeCategory, number>();
    const contentLower = content.toLowerCase();
    const pathLower = metadata.path.toLowerCase();
    const nameLower = metadata.name.toLowerCase();

    // Initialize all categories with base score
    const categories: KnowledgeCategory[] = [
      "Company",
      "Services",
      "Clients",
      "Projects",
      "Marketing",
      "Sales",
      "Branding",
      "Legal",
      "Finance",
      "HR",
      "Technology",
      "Processes",
      "Events",
      "Case Studies",
      "Invoices",
      "Meetings",
      "Knowledge Base",
      "General",
    ];

    for (const category of categories) {
      scores.set(category, 0);
    }

    // Score based on keywords in content
    if (options.useKeywords) {
      for (const [category, keywords] of this.categoryKeywords.entries()) {
        let keywordScore = 0;
        for (const keyword of keywords) {
          const regex = new RegExp(`\\b${keyword}\\b`, "gi");
          const matches = contentLower.match(regex);
          if (matches) {
            keywordScore += matches.length * 0.1;
          }
        }
        scores.set(category, (scores.get(category) || 0) + keywordScore);
      }
    }

    // Score based on path hints
    if (options.usePathHints) {
      const pathHints = this.getPathHints();
      for (const [category, hints] of pathHints.entries()) {
        let pathScore = 0;
        for (const hint of hints) {
          if (pathLower.includes(hint) || nameLower.includes(hint)) {
            pathScore += 0.5;
          }
        }
        scores.set(category, (scores.get(category) || 0) + pathScore);
      }
    }

    // Normalize scores
    const maxScore = Math.max(...scores.values());
    if (maxScore > 0) {
      for (const [category, score] of scores.entries()) {
        scores.set(category, score / maxScore);
      }
    }

    return scores;
  }

  /**
   * Get the top-scoring category.
   */
  private getTopCategory(scores: Map<KnowledgeCategory, number>): KnowledgeCategory {
    let topCategory: KnowledgeCategory = "General";
    let topScore = 0;

    for (const [category, score] of scores.entries()) {
      if (score > topScore) {
        topScore = score;
        topCategory = category;
      }
    }

    return topCategory;
  }

  /**
   * Initialize category keyword mappings.
   */
  private initializeCategoryKeywords(): Map<KnowledgeCategory, readonly string[]> {
    const map = new Map<KnowledgeCategory, readonly string[]>();

    map.set("Company", [
      "company", "corporation", "business", "enterprise", "organization", "firm",
      "headquarters", "subsidiary", "parent company", "holding", "group",
    ]);

    map.set("Services", [
      "service", "offering", "solution", "consulting", "support", "maintenance",
      "professional services", "managed services", "service level agreement",
    ]);

    map.set("Clients", [
      "client", "customer", "account", "buyer", "prospect", "lead",
      "customer relationship", "account management",
    ]);

    map.set("Projects", [
      "project", "initiative", "engagement", "deliverable", "milestone",
      "timeline", "scope", "project management",
    ]);

    map.set("Marketing", [
      "marketing", "campaign", "promotion", "advertisement", "branding",
      "social media", "content marketing", "digital marketing",
    ]);

    map.set("Sales", [
      "sales", "revenue", "deal", "pipeline", "quota", "commission",
      "proposal", "contract", "sales process",
    ]);

    map.set("Branding", [
      "brand", "logo", "identity", "guidelines", "style guide",
      "brand assets", "visual identity",
    ]);

    map.set("Legal", [
      "legal", "contract", "agreement", "terms", "conditions", "policy",
      "compliance", "regulation", "intellectual property", "nda",
    ]);

    map.set("Finance", [
      "finance", "financial", "budget", "cost", "expense", "revenue",
      "profit", "loss", "financial statement", "accounting",
    ]);

    map.set("HR", [
      "human resources", "hr", "employee", "staff", "personnel", "hiring",
      "recruitment", "onboarding", "training", "compensation", "benefits",
    ]);

    map.set("Technology", [
      "technology", "software", "hardware", "it", "infrastructure", "system",
      "platform", "application", "development", "programming", "api",
    ]);

    map.set("Processes", [
      "process", "workflow", "procedure", "sop", "standard operating procedure",
      "guideline", "protocol", "best practice",
    ]);

    map.set("Events", [
      "event", "conference", "meeting", "seminar", "workshop", "webinar",
      "trade show", "exhibition",
    ]);

    map.set("Case Studies", [
      "case study", "success story", "testimonial", "use case", "example",
      "case analysis",
    ]);

    map.set("Invoices", [
      "invoice", "bill", "receipt", "payment", "billing", "charge",
      "transaction", "accounts receivable", "accounts payable",
    ]);

    map.set("Meetings", [
      "meeting", "agenda", "minutes", "discussion", "call", "conference",
      "standup", "review", "sync",
    ]);

    map.set("Knowledge Base", [
      "knowledge base", "documentation", "guide", "tutorial", "manual",
      "faq", "help", "support article",
    ]);

    map.set("General", [
      "general", "miscellaneous", "other", "information", "data",
    ]);

    return map;
  }

  /**
   * Get path-based hints for classification.
   */
  private getPathHints(): Map<KnowledgeCategory, readonly string[]> {
    const map = new Map<KnowledgeCategory, readonly string[]>();

    map.set("Company", ["company", "about", "corporate", "organization"]);
    map.set("Services", ["services", "offerings", "solutions"]);
    map.set("Clients", ["clients", "customers", "accounts"]);
    map.set("Projects", ["projects", "initiatives", "engagements"]);
    map.set("Marketing", ["marketing", "campaigns", "promotions"]);
    map.set("Sales", ["sales", "deals", "pipeline"]);
    map.set("Branding", ["brand", "identity", "guidelines"]);
    map.set("Legal", ["legal", "contracts", "compliance"]);
    map.set("Finance", ["finance", "financial", "accounting"]);
    map.set("HR", ["hr", "human resources", "personnel"]);
    map.set("Technology", ["technology", "it", "development"]);
    map.set("Processes", ["processes", "workflows", "sops"]);
    map.set("Events", ["events", "conferences", "meetings"]);
    map.set("Case Studies", ["case-studies", "success-stories"]);
    map.set("Invoices", ["invoices", "billing", "payments"]);
    map.set("Meetings", ["meetings", "minutes", "agendas"]);
    map.set("Knowledge Base", ["knowledge-base", "docs", "documentation"]);

    return map;
  }
}
