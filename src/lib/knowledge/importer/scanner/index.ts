// ─── Scanner Module ──────────────────────────────────────────────────────────────

import type { FileMetadata, ScannedAsset, ScanOptions } from "../types";
import { FileSystem } from "../filesystem";
import { createHash } from "crypto";
import { fileTypeFromBuffer } from "file-type";
import { detectLanguage } from "../../normalizers/text";

export { AssetScanner };

/**
 * Scanner for discovering and collecting metadata from files.
 */
class AssetScanner {
  private readonly fs: FileSystem;
  private readonly supportedExtensions: ReadonlySet<string>;

  constructor(fs: FileSystem) {
    this.fs = fs;
    this.supportedExtensions = new Set([
      "md",
      "markdown",
      "pdf",
      "docx",
      "txt",
      "json",
      "csv",
    ]);
  }

  /**
   * Scan a directory and collect metadata for all files.
   */
  async scan(
    path: string,
    options: ScanOptions = {}
  ): Promise<readonly ScannedAsset[]> {
    const {
      recursive = true,
      includePatterns = [],
      excludePatterns = [],
    } = options;

    const files = await this.fs.listFiles(path, recursive);
    const assets: ScannedAsset[] = [];

    for (const file of files) {
      try {
        const metadata = await this.collectMetadata(file);
        
        if (this.matchesPatterns(file, includePatterns, excludePatterns)) {
          assets.push({
            metadata,
            error: null,
          });
        }
      } catch (error) {
        assets.push({
          metadata: this.createErrorMetadata(file),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return assets;
  }

  /**
   * Collect metadata for a single file.
   */
  async collectMetadata(path: string): Promise<FileMetadata> {
    const stats = await this.fs.getStats(path);
    const extension = this.fs.getExtension(path);
    const name = this.fs.basename(path);
    const relativePath = this.fs.getRelativePath(path);

    const buffer = await this.fs.readFile(path);
    const checksum = createHash("sha256").update(buffer).digest("hex");
    const mimeType = await this.detectMimeType(buffer, extension);

    const language = await this.detectFileLanguage(buffer, extension);

    return {
      path: this.fs.resolve(path),
      relativePath,
      name,
      extension,
      mimeType,
      size: stats.size,
      checksum,
      modifiedAt: stats.modifiedAt,
      createdAt: stats.createdAt,
      language,
      category: null,
      isSupported: this.supportedExtensions.has(extension),
    };
  }

  /**
   * Detect MIME type from buffer and extension.
   */
  private async detectMimeType(
    buffer: Buffer,
    extension: string
  ): Promise<string | null> {
    try {
      const fileType = await fileTypeFromBuffer(buffer);
      if (fileType) {
        return fileType.mime;
      }
    } catch {
      // Fall back to extension-based detection
    }

    const mimeMap: Record<string, string> = {
      md: "text/markdown",
      markdown: "text/markdown",
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      txt: "text/plain",
      json: "application/json",
      csv: "text/csv",
    };

    return mimeMap[extension] || null;
  }

  /**
   * Detect language from file content.
   */
  private async detectFileLanguage(
    buffer: Buffer,
    extension: string
  ): Promise<"en" | "ar" | "mixed" | "unknown"> {
    // For text-based files, attempt language detection
    if (["md", "markdown", "txt", "json", "csv"].includes(extension)) {
      try {
        const text = buffer.toString("utf-8", 0, Math.min(buffer.length, 10000));
        return detectLanguage(text);
      } catch {
        return "unknown";
      }
    }

    return "unknown";
  }

  /**
   * Check if file matches include/exclude patterns.
   */
  private matchesPatterns(
    path: string,
    includePatterns: readonly string[],
    excludePatterns: readonly string[]
  ): boolean {
    const normalizedPath = path.toLowerCase();

    // If no include patterns, include everything
    if (includePatterns.length === 0) {
      // Check exclude patterns
      for (const pattern of excludePatterns) {
        if (normalizedPath.includes(pattern.toLowerCase())) {
          return false;
        }
      }
      return true;
    }

    // Check include patterns
    let included = false;
    for (const pattern of includePatterns) {
      if (normalizedPath.includes(pattern.toLowerCase())) {
        included = true;
        break;
      }
    }

    if (!included) {
      return false;
    }

    // Check exclude patterns
    for (const pattern of excludePatterns) {
      if (normalizedPath.includes(pattern.toLowerCase())) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create error metadata for failed scans.
   */
  private createErrorMetadata(path: string): FileMetadata {
    const name = this.fs.basename(path);
    const extension = this.fs.getExtension(path);
    const relativePath = this.fs.getRelativePath(path);

    return {
      path: this.fs.resolve(path),
      relativePath,
      name,
      extension,
      mimeType: null,
      size: 0,
      checksum: "",
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      language: "unknown",
      category: null,
      isSupported: false,
    };
  }
}
