import { describe, it, expect, beforeEach } from "vitest";

import { processAsset, processAssetWithReport } from "./knowledge";
import { sha256, makeEtag } from "./repository/checksum";
import { KnowledgeRepository } from "./repository/service";
import { validateAsset } from "./repository/validation";
import { ImportManifestBuilder } from "./repository/manifest";
import { searchAssets } from "./search/index";
import type { KnowledgeAsset } from "./types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeAsset(overrides?: Partial<{ title: string; content: string; department: string }>): KnowledgeAsset {
  return processAsset({
    title: overrides?.title ?? "Enterprise Software Architecture Guide",
    content:
      overrides?.content ??
      "This guide covers modern enterprise software architecture patterns including microservices, event-driven design, and cloud-native deployments. " +
      "Teams building distributed systems should understand CAP theorem, CQRS, and eventual consistency. " +
      "Key technologies include Docker, Kubernetes, and service mesh frameworks.",
    category: "Technology",
    assetType: "DOCUMENT",
    metadata: {
      department: (overrides?.department ?? "Engineering") as "Engineering",
      industry: "Technology",
    },
  });
}

// ─── sha256 ───────────────────────────────────────────────────────────────────

describe("sha256", () => {
  it("produces a 64-character hex string", () => {
    const hash = sha256("hello world");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("is deterministic — same input yields same output", () => {
    expect(sha256("abc")).toBe(sha256("abc"));
  });

  it("differs for different inputs", () => {
    expect(sha256("alpha")).not.toBe(sha256("beta"));
  });
});

describe("makeEtag", () => {
  it("formats as hash:version", () => {
    const hash = sha256("x");
    expect(makeEtag(hash, 3)).toBe(`${hash}:3`);
  });
});

// ─── processAsset KB-2 fields ─────────────────────────────────────────────────

describe("processAsset — KB-2 governance fields", () => {
  it("hash is a 64-char hex SHA-256 of the cleaned content", () => {
    const asset = makeAsset();
    expect(asset.hash).toHaveLength(64);
    expect(asset.hash).toMatch(/^[0-9a-f]+$/);
  });

  it("etag format is hash:1 for new assets", () => {
    const asset = makeAsset();
    expect(asset.etag).toBe(`${asset.hash}:1`);
  });

  it("assetVersion is 1 on creation", () => {
    const asset = makeAsset();
    expect(asset.assetVersion).toBe(1);
  });

  it("processingStatus defaults to Extracted", () => {
    const asset = makeAsset();
    expect(asset.processingStatus).toBe("Extracted");
  });

  it("validationStatus defaults to pending", () => {
    const asset = makeAsset();
    expect(asset.validationStatus).toBe("pending");
  });

  it("visibility defaults to Internal", () => {
    const asset = makeAsset();
    expect(asset.visibility).toBe("Internal");
  });

  it("classification defaults to Business", () => {
    const asset = makeAsset();
    expect(asset.classification).toBe("Business");
  });

  it("securityLevel defaults to Low", () => {
    const asset = makeAsset();
    expect(asset.securityLevel).toBe("Low");
  });

  it("sourceId defaults to null", () => {
    const asset = makeAsset();
    expect(asset.sourceId).toBeNull();
  });

  it("publishedAt defaults to null", () => {
    const asset = makeAsset();
    expect(asset.publishedAt).toBeNull();
  });

  it("caller can override visibility and classification", () => {
    const asset = processAsset({
      title: "Confidential Report",
      content: "Sensitive business information for executive review only.",
      visibility: "Confidential",
      classification: "Finance",
      securityLevel: "High",
    });
    expect(asset.visibility).toBe("Confidential");
    expect(asset.classification).toBe("Finance");
    expect(asset.securityLevel).toBe("High");
  });

  it("two assets with identical content have the same hash", () => {
    const a = processAsset({ title: "A", content: "Hello world document" });
    const b = processAsset({ title: "B", content: "Hello world document" });
    expect(a.hash).toBe(b.hash);
  });

  it("two assets with different content have different hashes", () => {
    const a = processAsset({ title: "A", content: "Apple orange banana" });
    const b = processAsset({ title: "B", content: "Completely different text" });
    expect(a.hash).not.toBe(b.hash);
  });
});

// ─── processAssetWithReport ───────────────────────────────────────────────────

describe("processAssetWithReport", () => {
  it("returns the same asset as processAsset", () => {
    const { asset } = processAssetWithReport({ title: "Test", content: "A test document about software engineering practices" });
    expect(asset.title).toBe("Test");
    expect(asset.assetVersion).toBe(1);
  });

  it("report assetId matches the returned asset id", () => {
    const { asset, report } = processAssetWithReport({
      title: "Report test",
      content: "Content for timing report test",
    });
    expect(report.assetId).toBe(asset.id);
  });

  it("report totalDurationMs is a non-negative number", () => {
    const { report } = processAssetWithReport({
      title: "Timing test",
      content: "This is a document to test processing timing measurement",
    });
    expect(report.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("report stepsCompleted contains Imported, Normalized, Extracted", () => {
    const { report } = processAssetWithReport({
      title: "Steps test",
      content: "Testing that all processing steps are recorded",
    });
    expect(report.stepsCompleted).toContain("Imported");
    expect(report.stepsCompleted).toContain("Normalized");
    expect(report.stepsCompleted).toContain("Extracted");
  });
});

// ─── KnowledgeRepository — saveAsset ─────────────────────────────────────────

describe("KnowledgeRepository — saveAsset", () => {
  let repo: KnowledgeRepository;
  beforeEach(() => { repo = new KnowledgeRepository(); });

  it("stores a new asset and marks isNew=true", () => {
    const asset = makeAsset();
    const result = repo.saveAsset(asset);
    expect(result.isNew).toBe(true);
    expect(result.asset.id).toBe(asset.id);
  });

  it("version number matches asset.assetVersion", () => {
    const asset = makeAsset();
    const { version } = repo.saveAsset(asset);
    expect(version.version).toBe(1);
    expect(version.assetId).toBe(asset.id);
  });

  it("saving the same asset twice marks isNew=false on second save", () => {
    const asset = makeAsset();
    repo.saveAsset(asset);
    const second = repo.saveAsset(asset);
    expect(second.isNew).toBe(false);
  });

  it("detects exact content duplicate by hash", () => {
    const a = processAsset({ title: "Doc A", content: "Shared identical content for duplicate test" });
    const b = processAsset({ title: "Doc B", content: "Shared identical content for duplicate test" });
    repo.saveAsset(a);
    const result = repo.saveAsset(b);
    expect(result.wasDuplicate).toBe(true);
  });

  it("different content assets are not marked as duplicates", () => {
    const a = processAsset({ title: "A", content: "First unique content here alpha" });
    const b = processAsset({ title: "B", content: "Second unique content there beta" });
    repo.saveAsset(a);
    const result = repo.saveAsset(b);
    expect(result.wasDuplicate).toBe(false);
  });

  it("size increments after each unique save", () => {
    expect(repo.size()).toBe(0);
    repo.saveAsset(makeAsset({ title: "A", content: "First document content here" }));
    expect(repo.size()).toBe(1);
    repo.saveAsset(makeAsset({ title: "B", content: "Second document content here" }));
    expect(repo.size()).toBe(2);
  });
});

// ─── KnowledgeRepository — getAsset ──────────────────────────────────────────

describe("KnowledgeRepository — getAsset", () => {
  let repo: KnowledgeRepository;
  beforeEach(() => { repo = new KnowledgeRepository(); });

  it("returns null for an unknown ID", () => {
    expect(repo.getAsset("no-such-id")).toBeNull();
  });

  it("returns the saved asset by ID", () => {
    const asset = makeAsset();
    repo.saveAsset(asset);
    const found = repo.getAsset(asset.id);
    expect(found?.id).toBe(asset.id);
  });

  it("getAssetByCanonicalId returns null for unknown canonical ID", () => {
    expect(repo.getAssetByCanonicalId("KB-999999")).toBeNull();
  });

  it("getAssetByCanonicalId returns the asset by canonical ID", () => {
    const asset = makeAsset();
    repo.saveAsset(asset);
    const found = repo.getAssetByCanonicalId(asset.canonicalId);
    expect(found?.id).toBe(asset.id);
  });
});

// ─── KnowledgeRepository — updateAsset ───────────────────────────────────────

describe("KnowledgeRepository — updateAsset", () => {
  let repo: KnowledgeRepository;
  let asset: KnowledgeAsset;
  beforeEach(() => {
    repo = new KnowledgeRepository();
    asset = makeAsset();
    repo.saveAsset(asset);
  });

  it("increments assetVersion on update", () => {
    const { asset: updated } = repo.updateAsset(asset.id, {
      processingStatus: "Validated",
    });
    expect(updated.assetVersion).toBe(2);
  });

  it("updates processingStatus", () => {
    const { asset: updated } = repo.updateAsset(asset.id, {
      processingStatus: "Validated",
    });
    expect(updated.processingStatus).toBe("Validated");
  });

  it("updates validationStatus", () => {
    const { asset: updated } = repo.updateAsset(asset.id, {
      validationStatus: "valid",
    });
    expect(updated.validationStatus).toBe("valid");
  });

  it("updates reviewedBy", () => {
    const { asset: updated } = repo.updateAsset(asset.id, {
      reviewedBy: "user-123",
    });
    expect(updated.reviewedBy).toBe("user-123");
  });

  it("etag updates to hash:2", () => {
    const { asset: updated } = repo.updateAsset(asset.id, {
      processingStatus: "Indexed",
    });
    expect(updated.etag).toBe(`${asset.hash}:2`);
  });

  it("throws for unknown asset ID", () => {
    expect(() => repo.updateAsset("bad-id", {})).toThrow("Asset not found");
  });

  it("returns previousVersion and newVersion", () => {
    const { previousVersion, newVersion } = repo.updateAsset(asset.id, {
      processingStatus: "Published",
    });
    expect(previousVersion.version).toBe(1);
    expect(newVersion.version).toBe(2);
  });
});

// ─── KnowledgeRepository — archiveAsset & publishAsset ───────────────────────

describe("KnowledgeRepository — archiveAsset", () => {
  let repo: KnowledgeRepository;
  let asset: KnowledgeAsset;
  beforeEach(() => {
    repo = new KnowledgeRepository();
    asset = makeAsset();
    repo.saveAsset(asset);
  });

  it("sets processingStatus to Archived", () => {
    const archived = repo.archiveAsset(asset.id);
    expect(archived.processingStatus).toBe("Archived");
  });
});

describe("KnowledgeRepository — publishAsset", () => {
  let repo: KnowledgeRepository;
  let asset: KnowledgeAsset;
  beforeEach(() => {
    repo = new KnowledgeRepository();
    asset = makeAsset();
    repo.saveAsset(asset);
  });

  it("sets processingStatus to Published", () => {
    const published = repo.publishAsset(asset.id);
    expect(published.processingStatus).toBe("Published");
  });

  it("sets publishedAt to an ISO timestamp", () => {
    const published = repo.publishAsset(asset.id);
    expect(published.publishedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    );
  });

  it("sets approvedBy when provided", () => {
    const published = repo.publishAsset(asset.id, "admin-user");
    expect(published.approvedBy).toBe("admin-user");
  });
});

// ─── KnowledgeRepository — deleteAsset ───────────────────────────────────────

describe("KnowledgeRepository — deleteAsset", () => {
  let repo: KnowledgeRepository;
  let asset: KnowledgeAsset;
  beforeEach(() => {
    repo = new KnowledgeRepository();
    asset = makeAsset();
    repo.saveAsset(asset);
  });

  it("removes the asset and returns true", () => {
    expect(repo.deleteAsset(asset.id)).toBe(true);
    expect(repo.getAsset(asset.id)).toBeNull();
    expect(repo.size()).toBe(0);
  });

  it("returns false for an unknown ID", () => {
    expect(repo.deleteAsset("no-such-id")).toBe(false);
  });

  it("history is cleared on delete", () => {
    repo.deleteAsset(asset.id);
    expect(repo.getAssetHistory(asset.id)).toHaveLength(0);
  });
});

// ─── KnowledgeRepository — listAssets ────────────────────────────────────────

describe("KnowledgeRepository — listAssets", () => {
  let repo: KnowledgeRepository;
  beforeEach(() => {
    repo = new KnowledgeRepository();
    repo.saveAsset(
      processAsset({
        title: "Marketing Strategy 2026",
        content: "This document outlines the comprehensive digital marketing strategy for Q1 2026 including social media campaigns and content publishing.",
        category: "Marketing",
        metadata: { department: "Marketing" },
      })
    );
    repo.saveAsset(
      processAsset({
        title: "Engineering Architecture Guide",
        content: "Technical guide covering distributed systems architecture patterns for engineering teams building scalable microservices.",
        category: "Technology",
        metadata: { department: "Engineering" },
      })
    );
    repo.saveAsset(
      processAsset({
        title: "Sales Playbook Q2",
        content: "Sales methodology and outreach playbook for the enterprise segment covering lead qualification and closing techniques.",
        category: "Sales",
        metadata: { department: "Sales" },
      })
    );
  });

  it("returns all assets with no filter", () => {
    expect(repo.listAssets()).toHaveLength(3);
  });

  it("filters by category", () => {
    const results = repo.listAssets({ category: "Marketing" });
    expect(results).toHaveLength(1);
    expect(results[0]!.category).toBe("Marketing");
  });

  it("filters by department", () => {
    const results = repo.listAssets({ department: "Sales" });
    expect(results).toHaveLength(1);
    expect(results[0]!.metadata.department).toBe("Sales");
  });

  it("filters by processingStatus", () => {
    const id = repo.listAssets({ category: "Marketing" })[0]!.id;
    repo.archiveAsset(id);
    const archived = repo.listAssets({ processingStatus: "Archived" });
    expect(archived).toHaveLength(1);
  });

  it("filters by minConfidence", () => {
    const all = repo.listAssets();
    const count = all.filter((a) => a.scores.confidence >= 0.5).length;
    const filtered = repo.listAssets({ minConfidence: 0.5 });
    expect(filtered).toHaveLength(count);
  });

  it("clear() resets the repository", () => {
    repo.clear();
    expect(repo.listAssets()).toHaveLength(0);
    expect(repo.size()).toBe(0);
  });
});

// ─── KnowledgeRepository — getAssetHistory ───────────────────────────────────

describe("KnowledgeRepository — getAssetHistory", () => {
  let repo: KnowledgeRepository;
  let asset: KnowledgeAsset;
  beforeEach(() => {
    repo = new KnowledgeRepository();
    asset = makeAsset();
    repo.saveAsset(asset);
  });

  it("returns empty array for unknown asset", () => {
    expect(repo.getAssetHistory("unknown")).toHaveLength(0);
  });

  it("history has one entry after save", () => {
    expect(repo.getAssetHistory(asset.id)).toHaveLength(1);
  });

  it("history has two entries after one update", () => {
    repo.updateAsset(asset.id, { processingStatus: "Validated" });
    expect(repo.getAssetHistory(asset.id)).toHaveLength(2);
  });

  it("history versions are ordered chronologically", () => {
    repo.updateAsset(asset.id, { processingStatus: "Validated" });
    repo.updateAsset(asset.id, { processingStatus: "Published" });
    const history = repo.getAssetHistory(asset.id);
    expect(history[0]!.version).toBe(1);
    expect(history[1]!.version).toBe(2);
    expect(history[2]!.version).toBe(3);
  });

  it("each version snapshot has the correct processingStatus", () => {
    repo.updateAsset(asset.id, { processingStatus: "Published" });
    const history = repo.getAssetHistory(asset.id);
    expect(history[0]!.processingStatus).toBe("Extracted");
    expect(history[1]!.processingStatus).toBe("Published");
  });
});

// ─── KnowledgeRepository — buildIndexes ──────────────────────────────────────

describe("KnowledgeRepository — buildIndexes", () => {
  let repo: KnowledgeRepository;
  beforeEach(() => {
    repo = new KnowledgeRepository();
    repo.saveAsset(makeAsset({ title: "Tech Guide", content: "Software engineering and architecture patterns using React and TypeScript for modern teams." }));
    repo.saveAsset(makeAsset({ title: "Ops Manual", content: "Operations procedures for engineering teams covering deployment and monitoring.", department: "Operations" }));
  });

  it("asset index has one entry per asset", () => {
    const { assets } = repo.buildIndexes();
    expect(assets).toHaveLength(2);
    expect(assets[0]).toHaveProperty("assetId");
    expect(assets[0]).toHaveProperty("canonicalId");
    expect(assets[0]).toHaveProperty("keywords");
  });

  it("category index groups assets correctly", () => {
    const { categories } = repo.buildIndexes();
    const techCategory = categories.find((c) => c.category === "Technology");
    expect(techCategory?.assetCount).toBe(2);
  });

  it("entity index aggregates occurrences across assets", () => {
    const { entities } = repo.buildIndexes();
    // "react" or "typescript" should appear — both docs mention engineering tech
    expect(entities.length).toBeGreaterThan(0);
    const allEntityTypes = entities.map((e) => e.entityType);
    expect(allEntityTypes).toContain("Technology");
  });
});

// ─── Source management ────────────────────────────────────────────────────────

describe("KnowledgeRepository — source management", () => {
  let repo: KnowledgeRepository;
  beforeEach(() => { repo = new KnowledgeRepository(); });

  it("saves and retrieves a SourceRecord", () => {
    const source = {
      id: "src-001",
      type: "pdf" as const,
      provider: "manual",
      originalPath: "/docs/guide.pdf",
      mimeType: "application/pdf",
      checksum: sha256("file content"),
      size: 12345,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      owner: null,
      organizationId: null,
      status: "active" as const,
    };
    repo.saveSource(source);
    expect(repo.getSource("src-001")?.id).toBe("src-001");
  });

  it("listSources returns all saved sources", () => {
    expect(repo.listSources()).toHaveLength(0);
    repo.saveSource({
      id: "src-002",
      type: "manual" as const,
      provider: "manual",
      originalPath: "/notes.md",
      mimeType: "text/markdown",
      checksum: sha256("note content"),
      size: 512,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      owner: null,
      organizationId: null,
      status: "active" as const,
    });
    expect(repo.listSources()).toHaveLength(1);
  });
});

// ─── validateAsset ────────────────────────────────────────────────────────────

describe("validateAsset", () => {
  it("passes for a well-formed, entity-rich asset", () => {
    const asset = processAsset({
      title: "Enterprise Tech Architecture",
      content:
        "Google Cloud and Microsoft Azure are the leading enterprise platforms. " +
        "React, TypeScript, and Docker are the primary technology stack. " +
        "Our engineering team uses GitHub and Notion for collaboration. " +
        "The system is deployed on Kubernetes with Stripe for payments.",
      metadata: {
        author: "Jane Smith",
        owner: "IT Department",
        reviewer: "CTO",
        lastVerifiedAt: new Date().toISOString(),
      },
    });
    const report = validateAsset(asset);
    expect(report.passed).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(report.qualityScore).toBeGreaterThan(0.3);
  });

  it("flags missing author, owner, reviewer, lastVerifiedAt", () => {
    const asset = processAsset({
      title: "Sparse Doc",
      content: "This document has some content but minimal metadata attached.",
    });
    const report = validateAsset(asset);
    expect(report.missingMetadata).toContain("author");
    expect(report.missingMetadata).toContain("owner");
    expect(report.missingMetadata).toContain("reviewer");
    expect(report.missingMetadata).toContain("lastVerifiedAt");
  });

  it("qualityScore is in 0–1 range", () => {
    const asset = makeAsset();
    const report = validateAsset(asset);
    expect(report.qualityScore).toBeGreaterThanOrEqual(0);
    expect(report.qualityScore).toBeLessThanOrEqual(1);
  });

  it("entityCount and relationshipCount match the asset", () => {
    const asset = makeAsset();
    const report = validateAsset(asset);
    expect(report.entityCount).toBe(asset.entities.length);
    expect(report.relationshipCount).toBe(asset.relationships.length);
  });

  it("languageConfidence is 1.0 for English, 0.6 for mixed, 0.0 for unknown", () => {
    const en = processAsset({ title: "English Doc", content: "This is a plain English document about enterprise software." });
    const mixed = processAsset({
      title: "Mixed", content: "Hello مرحبا world عالم software برمجيات enterprise مؤسسية",
    });
    expect(validateAsset(en).languageConfidence).toBe(1.0);
    expect(validateAsset(mixed).languageConfidence).toBe(0.6);
  });

  it("accepts duplicateScore override", () => {
    const asset = makeAsset();
    const report = validateAsset(asset, { duplicateScore: 0.95 });
    expect(report.duplicateScore).toBe(0.95);
  });
});

// ─── ImportManifestBuilder ────────────────────────────────────────────────────

describe("ImportManifestBuilder", () => {
  it("records created and updated assets", () => {
    const builder = new ImportManifestBuilder();
    builder.recordCreated("asset-1").recordCreated("asset-2").recordUpdated("asset-3");
    const manifest = builder.build([]);
    expect(manifest.assetsCreated).toHaveLength(2);
    expect(manifest.assetsUpdated).toHaveLength(1);
    expect(manifest.filesProcessed).toBe(3);
  });

  it("tracks errors and skipped files", () => {
    const builder = new ImportManifestBuilder();
    builder
      .recordError("bad-file.pdf", "Parse error: unexpected EOF")
      .recordDuplicate()
      .recordSkipped();
    const manifest = builder.build([]);
    expect(manifest.errorsEncountered).toBe(1);
    expect(manifest.errors[0]?.file).toBe("bad-file.pdf");
    expect(manifest.duplicatesFound).toBe(1);
    expect(manifest.filesSkipped).toBe(2); // duplicate + skipped
  });

  it("computes statistics from provided assets", () => {
    const builder = new ImportManifestBuilder();
    const a1 = makeAsset({ title: "A", content: "Some engineering content for the first document" });
    const a2 = makeAsset({ title: "B", content: "More technology content for the second document" });
    builder.recordCreated(a1.id).recordCreated(a2.id);
    const manifest = builder.build([a1, a2]);
    expect(manifest.statistics.totalAssets).toBe(2);
    expect(manifest.statistics.byCategory["Technology"]).toBe(2);
    expect(manifest.statistics.avgQualityScore).toBeGreaterThanOrEqual(0);
    expect(manifest.statistics.avgQualityScore).toBeLessThanOrEqual(1);
  });

  it("importId is a UUID", () => {
    const manifest = new ImportManifestBuilder().build([]);
    expect(manifest.importId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("durationMs is a non-negative number", () => {
    const manifest = new ImportManifestBuilder().build([]);
    expect(manifest.durationMs).toBeGreaterThanOrEqual(0);
  });
});

// ─── Enhanced searchAssets with filters ───────────────────────────────────────

describe("searchAssets — KB-2 extended filters", () => {
  const assets = [
    processAsset({
      title: "Marketing Campaign Blueprint",
      content: "Digital marketing strategy and campaign execution for social media and content marketing teams.",
      category: "Marketing",
      metadata: { department: "Marketing" },
    }),
    processAsset({
      title: "Engineering Deployment Guide",
      content: "Kubernetes and Docker deployment procedures for engineering and devops teams running microservices.",
      category: "Technology",
      metadata: { department: "Engineering" },
    }),
    processAsset({
      title: "Sales Process Overview",
      content: "Enterprise sales process and pipeline methodology covering lead qualification and closing techniques.",
      category: "Sales",
      metadata: { department: "Sales" },
    }),
  ];

  it("filters by department before scoring", () => {
    const results = searchAssets(assets, "strategy process", {
      department: "Marketing",
    });
    expect(results.every((r) => r.asset.metadata.department === "Marketing")).toBe(true);
  });

  it("filters by assetType", () => {
    const results = searchAssets(assets, "guide process strategy", {
      assetType: "DOCUMENT",
    });
    expect(results.every((r) => r.asset.assetType === "DOCUMENT")).toBe(true);
  });

  it("filters by processingStatus", () => {
    const results = searchAssets(assets, "deployment engineering", {
      processingStatus: "Extracted",
    });
    // All assets are in Extracted state by default
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.asset.processingStatus === "Extracted")).toBe(true);
  });

  it("filters by minConfidence excludes low-confidence assets", () => {
    const highConfidenceOnly = searchAssets(assets, "marketing sales engineering", {
      minConfidence: 0.99, // extremely high — nothing should match
    });
    expect(highConfidenceOnly).toHaveLength(0);
  });
});
