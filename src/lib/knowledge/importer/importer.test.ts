import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FileSystem } from "./filesystem";
import { AssetScanner } from "./scanner";
import { AssetParser } from "./parser";
import { AssetClassifier } from "./classifier";
import { AssetValidator } from "./validator";
import { QualityReporter } from "./reporter";
import { AssetRegistry } from "./registry";
import type { FileMetadata } from "./types";
import { promises as fs } from "fs";
import { randomUUID } from "crypto";

describe("FileSystem", () => {
  let testDir: string;
  let filesystem: FileSystem;

  beforeEach(() => {
    testDir = `/tmp/test-fs-${randomUUID()}`;
    filesystem = new FileSystem(testDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should create directories", async () => {
    await filesystem.createDirectory("test/nested");
    expect(await filesystem.exists("test/nested")).toBe(true);
  });

  it("should write and read files", async () => {
    await filesystem.writeFile("test.txt", "Hello, World!");
    const content = await filesystem.readText("test.txt");
    expect(content).toBe("Hello, World!");
  });

  it("should get file stats", async () => {
    await filesystem.writeFile("test.txt", "Hello");
    const stats = await filesystem.getStats("test.txt");
    expect(stats.size).toBe(5);
    expect(stats.isFile).toBe(true);
    expect(stats.isDirectory).toBe(false);
  });

  it("should compute checksums", async () => {
    await filesystem.writeFile("test.txt", "Hello");
    const checksum = await filesystem.checksum("test.txt");
    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should list files", async () => {
    await filesystem.createDirectory("test");
    await filesystem.writeFile("test/file1.txt", "content1");
    await filesystem.writeFile("test/file2.txt", "content2");
    
    const files = await filesystem.listFiles("test", false);
    expect(files.length).toBe(2);
  });

  it("should get relative paths", async () => {
    const relativePath = filesystem.getRelativePath("test/nested/file.txt");
    expect(relativePath).toBe("test/nested/file.txt");
  });

  it("should get file extension", async () => {
    const ext = filesystem.getExtension("document.pdf");
    expect(ext).toBe("pdf");
  });

  it("should get file basename", async () => {
    const name = filesystem.basename("path/to/document.pdf");
    expect(name).toBe("document.pdf");
  });
});

describe("AssetScanner", () => {
  let testDir: string;
  let filesystem: FileSystem;
  let scanner: AssetScanner;

  beforeEach(async () => {
    testDir = `/tmp/test-scanner-${randomUUID()}`;
    filesystem = new FileSystem(testDir);
    scanner = new AssetScanner(filesystem);
    
    await filesystem.createDirectory("test");
    await filesystem.writeFile("test/file1.md", "# Test");
    await filesystem.writeFile("test/file2.txt", "Hello");
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should scan directory and collect metadata", async () => {
    const results = await scanner.scan("test", { recursive: true });
    expect(results.length).toBeGreaterThanOrEqual(2);
    
    const mdFile = results.find((r) => r.metadata.extension === "md");
    expect(mdFile).toBeDefined();
    expect(mdFile?.metadata.isSupported).toBe(true);
  });

  it("should collect file metadata correctly", async () => {
    const results = await scanner.scan("test", { recursive: true });
    const mdFile = results.find((r) => r.metadata.extension === "md");
    
    expect(mdFile?.metadata.name).toBe("file1.md");
    expect(mdFile?.metadata.size).toBeGreaterThan(0);
    expect(mdFile?.metadata.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(mdFile?.metadata.language).toBeDefined();
  });

  it("should handle unsupported files", async () => {
    await filesystem.writeFile("test/file.xyz", "content");
    const results = await scanner.scan("test", { recursive: true });
    
    const xyzFile = results.find((r) => r.metadata.extension === "xyz");
    expect(xyzFile?.metadata.isSupported).toBe(false);
  });

  it("should respect exclude patterns", async () => {
    await filesystem.createDirectory("test/node_modules");
    await filesystem.writeFile("test/node_modules/file.md", "# Test");
    
    const results = await scanner.scan("test", {
      recursive: true,
      excludePatterns: ["node_modules"],
    });
    
    const nodeModulesFile = results.find((r) => r.metadata.path.includes("node_modules"));
    expect(nodeModulesFile).toBeUndefined();
  });
});

describe("AssetParser", () => {
  let testDir: string;
  let filesystem: FileSystem;
  let parser: AssetParser;

  beforeEach(async () => {
    testDir = `/tmp/test-parser-${randomUUID()}`;
    filesystem = new FileSystem(testDir);
    parser = new AssetParser(filesystem);
    
    await filesystem.createDirectory("test");
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should parse markdown files", async () => {
    await filesystem.writeFile("test/file.md", "# Test Document\n\nThis is a test.");
    
    const metadata: FileMetadata = {
      path: filesystem.resolve("test/file.md"),
      relativePath: "test/file.md",
      name: "file.md",
      extension: "md",
      mimeType: "text/markdown",
      size: 30,
      checksum: "abc123",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "en",
      category: null,
      isSupported: true,
    };
    
    const result = await parser.parse(metadata);
    expect(result.error).toBeNull();
    expect(result.content).toContain("Test Document");
  });

  it("should parse text files", async () => {
    await filesystem.writeFile("test/file.txt", "Plain text content");
    
    const metadata: FileMetadata = {
      path: filesystem.resolve("test/file.txt"),
      relativePath: "test/file.txt",
      name: "file.txt",
      extension: "txt",
      mimeType: "text/plain",
      size: 18,
      checksum: "abc123",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "en",
      category: null,
      isSupported: true,
    };
    
    const result = await parser.parse(metadata);
    expect(result.error).toBeNull();
    expect(result.content).toBe("Plain text content");
  });

  it("should parse JSON files", async () => {
    await filesystem.writeFile("test/file.json", '{"key": "value"}');
    
    const metadata: FileMetadata = {
      path: filesystem.resolve("test/file.json"),
      relativePath: "test/file.json",
      name: "file.json",
      extension: "json",
      mimeType: "application/json",
      size: 17,
      checksum: "abc123",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "en",
      category: null,
      isSupported: true,
    };
    
    const result = await parser.parse(metadata);
    expect(result.error).toBeNull();
    expect(result.content).toContain("key");
  });

  it("should reject unsupported file types", async () => {
    const metadata: FileMetadata = {
      path: filesystem.resolve("test/file.xyz"),
      relativePath: "test/file.xyz",
      name: "file.xyz",
      extension: "xyz",
      mimeType: null,
      size: 10,
      checksum: "abc123",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "unknown",
      category: null,
      isSupported: false,
    };
    
    const result = await parser.parse(metadata);
    expect(result.error).toContain("Unsupported file extension");
  });

  it("should enforce file size limits", async () => {
    const metadata: FileMetadata = {
      path: filesystem.resolve("test/file.txt"),
      relativePath: "test/file.txt",
      name: "file.txt",
      extension: "txt",
      mimeType: "text/plain",
      size: 100 * 1024 * 1024, // 100MB
      checksum: "abc123",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "en",
      category: null,
      isSupported: true,
    };
    
    const result = await parser.parse(metadata, { maxFileSize: 50 * 1024 * 1024 });
    expect(result.error).toContain("exceeds maximum");
  });
});

describe("AssetClassifier", () => {
  let classifier: AssetClassifier;

  beforeEach(() => {
    classifier = new AssetClassifier();
  });

  it("should classify marketing content", () => {
    const metadata: FileMetadata = {
      path: "/path/to/marketing-campaign.md",
      relativePath: "marketing-campaign.md",
      name: "marketing-campaign.md",
      extension: "md",
      mimeType: "text/markdown",
      size: 100,
      checksum: "abc123",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "en",
      category: null,
      isSupported: true,
    };
    
    const content = "This is a marketing campaign for promoting our brand through social media.";
    const result = classifier.classify(metadata, content);
    
    expect(result.category).toBe("Marketing");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("should classify legal content", () => {
    const metadata: FileMetadata = {
      path: "/path/to/contract.pdf",
      relativePath: "contract.pdf",
      name: "contract.pdf",
      extension: "pdf",
      mimeType: "application/pdf",
      size: 100,
      checksum: "abc123",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "en",
      category: null,
      isSupported: true,
    };
    
    const content = "This contract outlines the terms and conditions for the agreement.";
    const result = classifier.classify(metadata, content);
    
    expect(result.category).toBe("Legal");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("should classify finance content", () => {
    const metadata: FileMetadata = {
      path: "/path/to/budget.xlsx",
      relativePath: "budget.xlsx",
      name: "budget.xlsx",
      extension: "xlsx",
      mimeType: null,
      size: 100,
      checksum: "abc123",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "en",
      category: null,
      isSupported: false,
    };
    
    const content = "Budget allocation for Q4 includes marketing expenses and revenue projections.";
    const result = classifier.classify(metadata, content);
    
    expect(result.category).toBe("Finance");
  });

  it("should use path hints for classification", () => {
    const metadata: FileMetadata = {
      path: "/path/to/services/offerings.md",
      relativePath: "services/offerings.md",
      name: "offerings.md",
      extension: "md",
      mimeType: "text/markdown",
      size: 100,
      checksum: "abc123",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "en",
      category: null,
      isSupported: true,
    };
    
    const content = "Generic content without specific keywords.";
    const result = classifier.classify(metadata, content, { usePathHints: true });
    
    expect(result.category).toBe("Services");
  });

  it("should default to General for unclear content", () => {
    const metadata: FileMetadata = {
      path: "/path/to/generic.txt",
      relativePath: "generic.txt",
      name: "generic.txt",
      extension: "txt",
      mimeType: "text/plain",
      size: 100,
      checksum: "abc123",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "en",
      category: null,
      isSupported: true,
    };
    
    const content = "Some random text without clear category signals.";
    const result = classifier.classify(metadata, content);
    
    expect(result.category).toBe("General");
  });
});

describe("AssetValidator", () => {
  let testDir: string;
  let filesystem: FileSystem;
  let validator: AssetValidator;

  beforeEach(async () => {
    testDir = `/tmp/test-validator-${randomUUID()}`;
    filesystem = new FileSystem(testDir);
    validator = new AssetValidator(filesystem);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should validate valid assets", async () => {
    const metadata: FileMetadata = {
      path: "/path/to/file.md",
      relativePath: "file.md",
      name: "file.md",
      extension: "md",
      mimeType: "text/markdown",
      size: 100,
      checksum: "abc123",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "en",
      category: "General",
      isSupported: true,
    };
    
    const result = await validator.validate(metadata, "Valid content with sufficient length");
    expect(result.passed).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject empty content", async () => {
    const metadata: FileMetadata = {
      path: "/path/to/file.md",
      relativePath: "file.md",
      name: "file.md",
      extension: "md",
      mimeType: "text/markdown",
      size: 0,
      checksum: "abc123",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "en",
      category: "General",
      isSupported: true,
    };
    
    const result = await validator.validate(metadata, "");
    expect(result.passed).toBe(false);
    expect(result.errors).toContain("File content is empty");
  });

  it("should warn about very short content", async () => {
    const metadata: FileMetadata = {
      path: "/path/to/file.md",
      relativePath: "file.md",
      name: "file.md",
      extension: "md",
      mimeType: "text/markdown",
      size: 5,
      checksum: "abc123",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "en",
      category: "General",
      isSupported: true,
    };
    
    const result = await validator.validate(metadata, "short");
    expect(result.passed).toBe(true);
    expect(result.warnings).toContain("File content is very short (< 10 characters)");
  });

  it("should reject oversized files", async () => {
    const metadata: FileMetadata = {
      path: "/path/to/file.md",
      relativePath: "file.md",
      name: "file.md",
      extension: "md",
      mimeType: "text/markdown",
      size: 100 * 1024 * 1024,
      checksum: "abc123",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "en",
      category: "General",
      isSupported: true,
    };
    
    const result = await validator.validate(metadata, "content", { maxFileSize: 50 * 1024 * 1024 });
    expect(result.passed).toBe(false);
    expect(result.errors.some(e => e.includes("exceeds maximum"))).toBe(true);
  });

  it("should warn about missing category", async () => {
    const metadata: FileMetadata = {
      path: "/path/to/file.md",
      relativePath: "file.md",
      name: "file.md",
      extension: "md",
      mimeType: "text/markdown",
      size: 100,
      checksum: "abc123",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "en",
      category: null,
      isSupported: true,
    };
    
    const result = await validator.validate(metadata, "Valid content");
    expect(result.warnings).toContain("Asset has no category assigned");
  });

  it("should validate batch of assets", async () => {
    const assets = [
      {
        metadata: {
          path: "/path/to/file1.md",
          relativePath: "file1.md",
          name: "file1.md",
          extension: "md",
          mimeType: "text/markdown",
          size: 100,
          checksum: "abc123",
          modifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          language: "en",
          category: "General",
          isSupported: true,
        } as FileMetadata,
        content: "Valid content",
      },
      {
        metadata: {
          path: "/path/to/file2.md",
          relativePath: "file2.md",
          name: "file2.md",
          extension: "md",
          mimeType: "text/markdown",
          size: 0,
          checksum: "def456",
          modifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          language: "en",
          category: "General",
          isSupported: true,
        } as FileMetadata,
        content: "",
      },
    ];
    
    const report = await validator.validateBatch(assets);
    expect(report.totalAssets).toBe(2);
    expect(report.passedAssets).toBe(1);
    expect(report.failedAssets).toBe(1);
  });
});

describe("QualityReporter", () => {
  let testDir: string;
  let filesystem: FileSystem;
  let reporter: QualityReporter;

  beforeEach(async () => {
    testDir = `/tmp/test-reporter-${randomUUID()}`;
    filesystem = new FileSystem(testDir);
    reporter = new QualityReporter(filesystem);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should generate markdown report", () => {
    const report = {
      totalAssets: 10,
      passedAssets: 8,
      failedAssets: 2,
      warningCount: 5,
      errorCount: 2,
      missingMetadata: ["file1.md"],
      duplicateFiles: [],
      brokenFiles: [],
      unreadableFiles: [],
      unsupportedExtensions: ["file.xyz"],
      duplicateHashes: [],
      oversizedFiles: [],
      coverageStatistics: {
        byCategory: { General: 5, Marketing: 3 },
        byExtension: { md: 8, pdf: 2 },
        byLanguage: { en: 10 },
        averageFileSize: 1024,
        totalSize: 10240,
      },
    };
    
    const markdown = reporter.generateMarkdownReport(report);
    expect(markdown).toContain("# Knowledge Asset Quality Report");
    expect(markdown).toContain("Total Assets: 10");
    expect(markdown).toContain("Passed: 8");
    expect(markdown).toContain("Failed: 2");
  });

  it("should generate CSV report", () => {
    const report = {
      totalAssets: 10,
      passedAssets: 8,
      failedAssets: 2,
      warningCount: 5,
      errorCount: 2,
      missingMetadata: [],
      duplicateFiles: [],
      brokenFiles: [],
      unreadableFiles: [],
      unsupportedExtensions: [],
      duplicateHashes: [],
      oversizedFiles: [],
      coverageStatistics: {
        byCategory: {},
        byExtension: {},
        byLanguage: {},
        averageFileSize: 1024,
        totalSize: 10240,
      },
    };
    
    const csv = reporter.generateCsvReport(report);
    expect(csv).toContain("metric,value");
    expect(csv).toContain("total_assets,10");
    expect(csv).toContain("passed_assets,8");
  });

  it("should save report to file", async () => {
    const report = {
      totalAssets: 10,
      passedAssets: 8,
      failedAssets: 2,
      warningCount: 5,
      errorCount: 2,
      missingMetadata: [],
      duplicateFiles: [],
      brokenFiles: [],
      unreadableFiles: [],
      unsupportedExtensions: [],
      duplicateHashes: [],
      oversizedFiles: [],
      coverageStatistics: {
        byCategory: {},
        byExtension: {},
        byLanguage: {},
        averageFileSize: 1024,
        totalSize: 10240,
      },
    };
    
    await reporter.generateReport(report, "report.json");
    expect(await filesystem.exists("report.json")).toBe(true);
    
    const content = await filesystem.readText("report.json");
    expect(content).toContain("totalAssets");
  });
});

describe("AssetRegistry", () => {
  let testDir: string;
  let filesystem: FileSystem;
  let registry: AssetRegistry;

  beforeEach(async () => {
    testDir = `/tmp/test-registry-${randomUUID()}`;
    filesystem = new FileSystem(testDir);
    registry = new AssetRegistry(filesystem, "registry.json");
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should register new assets", async () => {
    const metadata: FileMetadata = {
      path: "/path/to/file.md",
      relativePath: "file.md",
      name: "file.md",
      extension: "md",
      mimeType: "text/markdown",
      size: 100,
      checksum: "abc123",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "en",
      category: null,
      isSupported: true,
    };
    
    const entry = await registry.register(metadata, "General");
    expect(entry.path).toBe("/path/to/file.md");
    expect(entry.category).toBe("General");
    expect(entry.version).toBe(1);
  });

  it("should update existing assets", async () => {
    const metadata: FileMetadata = {
      path: "/path/to/file.md",
      relativePath: "file.md",
      name: "file.md",
      extension: "md",
      mimeType: "text/markdown",
      size: 100,
      checksum: "abc123",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "en",
      category: null,
      isSupported: true,
    };
    
    await registry.register(metadata, "General");
    
    const updatedMetadata = { ...metadata, checksum: "def456" };
    const updatedEntry = await registry.register(updatedMetadata, "Marketing");
    
    expect(updatedEntry.version).toBe(2);
    expect(updatedEntry.checksum).toBe("def456");
    expect(updatedEntry.category).toBe("Marketing");
  });

  it("should check if asset is processed", async () => {
    const metadata: FileMetadata = {
      path: "/path/to/file.md",
      relativePath: "file.md",
      name: "file.md",
      extension: "md",
      mimeType: "text/markdown",
      size: 100,
      checksum: "abc123",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "en",
      category: null,
      isSupported: true,
    };
    
    expect(registry.isProcessed("/path/to/file.md")).toBe(false);
    
    await registry.register(metadata, "General");
    expect(registry.isProcessed("/path/to/file.md")).toBe(true);
  });

  it("should detect changes", async () => {
    const metadata: FileMetadata = {
      path: "/path/to/file.md",
      relativePath: "file.md",
      name: "file.md",
      extension: "md",
      mimeType: "text/markdown",
      size: 100,
      checksum: "abc123",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "en",
      category: null,
      isSupported: true,
    };
    
    await registry.register(metadata, "General");
    
    expect(registry.hasChanged("/path/to/file.md", "abc123")).toBe(false);
    expect(registry.hasChanged("/path/to/file.md", "def456")).toBe(true);
  });

  it("should get statistics", async () => {
    const metadata1: FileMetadata = {
      path: "/path/to/file1.md",
      relativePath: "file1.md",
      name: "file1.md",
      extension: "md",
      mimeType: "text/markdown",
      size: 100,
      checksum: "abc123",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "en",
      category: null,
      isSupported: true,
    };
    
    const metadata2: FileMetadata = {
      path: "/path/to/file2.md",
      relativePath: "file2.md",
      name: "file2.md",
      extension: "md",
      mimeType: "text/markdown",
      size: 100,
      checksum: "def456",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "en",
      category: null,
      isSupported: true,
    };
    
    await registry.register(metadata1, "General");
    await registry.register(metadata2, "Marketing");
    
    const stats = registry.getStatistics();
    expect(stats.totalEntries).toBe(2);
    expect(stats.byCategory.General).toBe(1);
    expect(stats.byCategory.Marketing).toBe(1);
  });

  it("should save and load registry", async () => {
    const metadata: FileMetadata = {
      path: "/path/to/file.md",
      relativePath: "file.md",
      name: "file.md",
      extension: "md",
      mimeType: "text/markdown",
      size: 100,
      checksum: "abc123",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "en",
      category: null,
      isSupported: true,
    };
    
    await registry.register(metadata, "General");
    await registry.save();
    
    const newRegistry = new AssetRegistry(filesystem, "registry.json");
    await newRegistry.load();
    
    expect(newRegistry.isProcessed("/path/to/file.md")).toBe(true);
  });
});
