// ─── Registry Module ─────────────────────────────────────────────────────────────

import type { RegistryEntry, RegistryState, FileMetadata } from "../types";
import type { KnowledgeCategory } from "../../types";
import { FileSystem } from "../filesystem";

export { AssetRegistry };

/**
 * Registry for tracking processed assets and their state.
 */
class AssetRegistry {
  private readonly fs: FileSystem;
  private readonly registryPath: string;
  private state: RegistryState;

  constructor(fs: FileSystem, registryPath: string) {
    this.fs = fs;
    this.registryPath = registryPath;
    this.state = {
      entries: [],
      lastUpdated: new Date().toISOString(),
      version: "1.0.0",
    };
  }

  /**
   * Load the registry from disk.
   */
  async load(): Promise<void> {
    if (await this.fs.exists(this.registryPath)) {
      try {
        const content = await this.fs.readText(this.registryPath);
        this.state = JSON.parse(content);
      } catch {
        // If loading fails, start with empty state
        this.state = {
          entries: [],
          lastUpdated: new Date().toISOString(),
          version: "1.0.0",
        };
      }
    }
  }

  /**
   * Save the registry to disk.
   */
  async save(): Promise<void> {
    this.state.lastUpdated = new Date().toISOString();
    const content = JSON.stringify(this.state, null, 2);
    await this.fs.writeFile(this.registryPath, content);
  }

  /**
   * Register a processed asset.
   */
  async register(
    metadata: FileMetadata,
    category: KnowledgeCategory
  ): Promise<RegistryEntry> {
    const existingEntry = this.getEntryByPath(metadata.path);

    if (existingEntry) {
      // Update existing entry
      const updatedEntry: RegistryEntry = {
        ...existingEntry,
        checksum: metadata.checksum,
        category,
        lastModified: metadata.modifiedAt,
        version: existingEntry.version + 1,
      };

      this.state.entries = this.state.entries.map((entry) =>
        entry.path === metadata.path ? updatedEntry : entry
      );

      await this.save();
      return updatedEntry;
    }

    // Create new entry
    const newEntry: RegistryEntry = {
      path: metadata.path,
      checksum: metadata.checksum,
      category,
      processedAt: new Date().toISOString(),
      lastModified: metadata.modifiedAt,
      version: 1,
    };

    this.state.entries = [...this.state.entries, newEntry];
    await this.save();
    return newEntry;
  }

  /**
   * Unregister an asset.
   */
  async unregister(path: string): Promise<boolean> {
    const exists = this.getEntryByPath(path) !== undefined;

    if (exists) {
      this.state.entries = this.state.entries.filter((entry) => entry.path !== path);
      await this.save();
    }

    return exists;
  }

  /**
   * Get an entry by path.
   */
  getEntryByPath(path: string): RegistryEntry | undefined {
    return this.state.entries.find((entry) => entry.path === path);
  }

  /**
   * Get an entry by checksum.
   */
  getEntryByChecksum(checksum: string): RegistryEntry | undefined {
    return this.state.entries.find((entry) => entry.checksum === checksum);
  }

  /**
   * Get all entries.
   */
  getAllEntries(): readonly RegistryEntry[] {
    return this.state.entries;
  }

  /**
   * Get entries by category.
   */
  getEntriesByCategory(category: KnowledgeCategory): readonly RegistryEntry[] {
    return this.state.entries.filter((entry) => entry.category === category);
  }

  /**
   * Check if an asset has been processed.
   */
  isProcessed(path: string): boolean {
    return this.getEntryByPath(path) !== undefined;
  }

  /**
   * Check if an asset has changed since last processing.
   */
  hasChanged(path: string, currentChecksum: string): boolean {
    const entry = this.getEntryByPath(path);
    if (!entry) {
      return true; // New asset
    }
    return entry.checksum !== currentChecksum;
  }

  /**
   * Get the registry state.
   */
  getState(): RegistryState {
    return { ...this.state };
  }

  /**
   * Clear the registry.
   */
  async clear(): Promise<void> {
    this.state = {
      entries: [],
      lastUpdated: new Date().toISOString(),
      version: "1.0.0",
    };
    await this.save();
  }

  /**
   * Get statistics about the registry.
   */
  getStatistics(): {
    totalEntries: number;
    byCategory: Record<string, number>;
    totalVersions: number;
  } {
    const byCategory: Record<string, number> = {};
    let totalVersions = 0;

    for (const entry of this.state.entries) {
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
      totalVersions += entry.version;
    }

    return {
      totalEntries: this.state.entries.length,
      byCategory,
      totalVersions,
    };
  }
}
