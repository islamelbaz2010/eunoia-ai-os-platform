// ─── Parser Module ───────────────────────────────────────────────────────────────

import type { FileMetadata, ParsedAsset, ParserOptions } from "../types";
import { FileSystem } from "../filesystem";
import mammoth from "mammoth";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

export { AssetParser };

/**
 * Parser for extracting text content from supported file formats.
 */
class AssetParser {
  private readonly fs: FileSystem;
  private readonly defaultOptions: ParserOptions;

  constructor(fs: FileSystem, options: ParserOptions = {}) {
    this.fs = fs;
    this.defaultOptions = {
      encoding: "utf-8",
      maxFileSize: 50 * 1024 * 1024, // 50MB
      preserveFormatting: false,
      ...options,
    };
  }

  /**
   * Parse a file and extract its text content.
   */
  async parse(
    metadata: FileMetadata,
    options: ParserOptions = {}
  ): Promise<ParsedAsset> {
    const opts = { ...this.defaultOptions, ...options };

    // Check file size limit
    if (opts.maxFileSize && metadata.size > opts.maxFileSize) {
      return {
        metadata,
        content: "",
        error: `File size (${metadata.size} bytes) exceeds maximum (${opts.maxFileSize} bytes)`,
      };
    }

    try {
      const content = await this.extractContent(metadata, opts);
      return {
        metadata,
        content,
        error: null,
      };
    } catch (error) {
      return {
        metadata,
        content: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Extract content based on file extension.
   */
  private async extractContent(
    metadata: FileMetadata,
    options: ParserOptions
  ): Promise<string> {
    const { extension } = metadata;

    switch (extension) {
      case "md":
      case "markdown":
        return await this.parseMarkdown(metadata, options);
      case "txt":
        return await this.parseText(metadata, options);
      case "json":
        return await this.parseJson(metadata, options);
      case "csv":
        return await this.parseCsv(metadata, options);
      case "pdf":
        return await this.parsePdf(metadata, options);
      case "docx":
        return await this.parseDocx(metadata, options);
      default:
        throw new Error(`Unsupported file extension: ${extension}`);
    }
  }

  /**
   * Parse Markdown file.
   */
  private async parseMarkdown(
    metadata: FileMetadata,
    options: ParserOptions
  ): Promise<string> {
    const encoding = options.encoding || "utf-8";
    return await this.fs.readText(metadata.path, encoding);
  }

  /**
   * Parse plain text file.
   */
  private async parseText(
    metadata: FileMetadata,
    options: ParserOptions
  ): Promise<string> {
    const encoding = options.encoding || "utf-8";
    return await this.fs.readText(metadata.path, encoding);
  }

  /**
   * Parse JSON file.
   */
  private async parseJson(
    metadata: FileMetadata,
    options: ParserOptions
  ): Promise<string> {
    const encoding = options.encoding || "utf-8";
    const content = await this.fs.readText(metadata.path, encoding);
    
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      // If JSON parsing fails, return raw content
      return content;
    }
  }

  /**
   * Parse CSV file.
   */
  private async parseCsv(
    metadata: FileMetadata,
    options: ParserOptions
  ): Promise<string> {
    const encoding = options.encoding || "utf-8";
    return await this.fs.readText(metadata.path, encoding);
  }

  /**
   * Parse PDF file.
   */
  private async parsePdf(
    metadata: FileMetadata,
    _options: ParserOptions
  ): Promise<string> {
    const buffer = await this.fs.readFile(metadata.path);
    const data = await pdfParse(buffer);
    return data.text;
  }

  /**
   * Parse DOCX file.
   */
  private async parseDocx(
    metadata: FileMetadata,
    _options: ParserOptions
  ): Promise<string> {
    const buffer = await this.fs.readFile(metadata.path);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  /**
   * Check if a file extension is supported.
   */
  isSupported(extension: string): boolean {
    const supportedExtensions = ["md", "markdown", "pdf", "docx", "txt", "json", "csv"];
    return supportedExtensions.includes(extension.toLowerCase());
  }
}
