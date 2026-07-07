// ─── Filesystem Module ───────────────────────────────────────────────────────────

import { promises as fs } from "fs";
import { join, relative, normalize, sep } from "path";
import { createHash } from "crypto";

export { FileSystem };

/**
 * Cross-platform filesystem operations.
 * Provides abstraction over Node.js fs module with consistent path handling.
 */
class FileSystem {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = normalize(basePath);
  }

  /**
   * Check if a path exists.
   */
  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(path));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file statistics.
   */
  async getStats(path: string): Promise<Stats> {
    const resolvedPath = this.resolve(path);
    const stats = await fs.stat(resolvedPath);
    return {
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      isSymbolicLink: stats.isSymbolicLink(),
      createdAt: stats.birthtime.toISOString(),
      modifiedAt: stats.mtime.toISOString(),
    };
  }

  /**
   * Read file content as buffer.
   */
  async readFile(path: string): Promise<Buffer> {
    const resolvedPath = this.resolve(path);
    return await fs.readFile(resolvedPath);
  }

  /**
   * Read file content as string.
   */
  async readText(path: string, encoding: BufferEncoding = "utf-8"): Promise<string> {
    const resolvedPath = this.resolve(path);
    return await fs.readFile(resolvedPath, encoding);
  }

  /**
   * Write file content.
   */
  async writeFile(path: string, content: string | Buffer): Promise<void> {
    const resolvedPath = this.resolve(path);
    const dir = this.dirname(resolvedPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(resolvedPath, content);
  }

  /**
   * Delete a file.
   */
  async deleteFile(path: string): Promise<void> {
    const resolvedPath = this.resolve(path);
    await fs.unlink(resolvedPath);
  }

  /**
   * Create a directory.
   */
  async createDirectory(path: string): Promise<void> {
    const resolvedPath = this.resolve(path);
    await fs.mkdir(resolvedPath, { recursive: true });
  }

  /**
   * List directory contents.
   */
  async listDirectory(path: string): Promise<string[]> {
    const resolvedPath = this.resolve(path);
    return await fs.readdir(resolvedPath);
  }

  /**
   * Recursively list all files in a directory.
   */
  async listFiles(path: string, recursive: boolean = true): Promise<string[]> {
    const files: string[] = [];
    const resolvedPath = this.resolve(path);

    async function traverse(currentPath: string): Promise<void> {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name);

        if (entry.isDirectory()) {
          if (recursive) {
            await traverse(fullPath);
          }
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    }

    await traverse(resolvedPath);
    return files.map((f) => this.getRelativePath(f));
  }

  /**
   * Compute SHA-256 checksum of a file.
   */
  async checksum(path: string): Promise<string> {
    const content = await this.readFile(path);
    return createHash("sha256").update(content).digest("hex");
  }

  /**
   * Get relative path from base path.
   */
  getRelativePath(path: string): string {
    const resolvedPath = this.resolve(path);
    return relative(this.basePath, resolvedPath);
  }

  /**
   * Resolve path relative to base path.
   */
  resolve(path: string): string {
    const normalizedPath = normalize(path);
    if (isAbsolute(normalizedPath)) {
      return normalizedPath;
    }
    return join(this.basePath, normalizedPath);
  }

  /**
   * Get directory name of a path.
   */
  private dirname(path: string): string {
    const parts = path.split(sep);
    parts.pop();
    return parts.join(sep) || ".";
  }

  /**
   * Get file extension.
   */
  getExtension(path: string): string {
    const basename = this.basename(path);
    const parts = basename.split(".");
    if (parts.length > 1) {
      return parts.pop()!.toLowerCase();
    }
    return "";
  }

  /**
   * Get file basename.
   */
  basename(path: string): string {
    return path.split(sep).pop() || path;
  }

  /**
   * Get base path.
   */
  getBasePath(): string {
    return this.basePath;
  }
}

/**
 * File statistics.
 */
interface Stats {
  readonly size: number;
  readonly isFile: boolean;
  readonly isDirectory: boolean;
  readonly isSymbolicLink: boolean;
  readonly createdAt: string;
  readonly modifiedAt: string;
}

/**
 * Check if a path is absolute.
 */
function isAbsolute(path: string): boolean {
  return path.startsWith("/") || path.match(/^[A-Za-z]:/) !== null;
}
