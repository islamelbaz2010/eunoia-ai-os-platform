#!/usr/bin/env node

// ─── Watch Assets Script ───────────────────────────────────────────────────────────

import { FileSystem } from "../../src/lib/knowledge/importer/filesystem";
import { AssetScanner } from "../../src/lib/knowledge/importer/scanner";
import { AssetParser } from "../../src/lib/knowledge/importer/parser";
import { processAsset } from "../../src/lib/knowledge/knowledge";
import chokidar from "chokidar";
import type {
  AssetIndexEntry,
  CategoryIndexEntry,
  EntityIndexEntry,
  RelationshipIndexEntry,
  WatchOptions,
} from "../../src/lib/knowledge/importer/types";

/**
 * Watch knowledge/assets directory for changes and regenerate indexes.
 */
async function main() {
  const assetsPath = process.argv[2] || "knowledge/assets";
  const outputPath = process.argv[3] || "knowledge/index";

  console.log(`Watching assets from: ${assetsPath}`);
  console.log(`Output directory: ${outputPath}`);

  const fs = new FileSystem(assetsPath);

  // Check if directory exists
  if (!(await fs.exists(assetsPath))) {
    console.error(`Error: Directory does not exist: ${assetsPath}`);
    process.exit(1);
  }

  const scanner = new AssetScanner(fs);
  const parser = new AssetParser(fs);
  const outputFs = new FileSystem(".");

  // Create output directory
  await outputFs.createDirectory(outputPath);

  const options: WatchOptions = {
    debounceMs: 1000,
    ignoreInitial: false,
    ignorePatterns: ["node_modules", ".git", ".next"],
  };

  let isProcessing = false;
  let needsRebuild = false;

  // Debounced rebuild function
  const scheduleRebuild = () => {
    if (isProcessing) {
      needsRebuild = true;
      return;
    }
    isProcessing = true;
    needsRebuild = false;

    setTimeout(async () => {
      await rebuildIndexes();
      isProcessing = false;
      
      if (needsRebuild) {
        scheduleRebuild();
      }
    }, options.debounceMs);
  };

  // Rebuild indexes
  async function rebuildIndexes() {
    console.log(`\n[${new Date().toISOString()}] Rebuilding indexes...`);

    try {
      const startTime = Date.now();

      // Scan assets
      const scannedAssets = await scanner.scan(assetsPath, {
        recursive: true,
        excludePatterns: options.ignorePatterns,
      });

      // Process assets and generate indexes
      const assetIndexEntries: AssetIndexEntry[] = [];
      const entityIndexEntries: EntityIndexEntry[] = [];
      const relationshipIndexEntries: RelationshipIndexEntry[] = [];
      const categoryMap = new Map<string, { count: number; totalSize: number }>();

      for (const scannedAsset of scannedAssets) {
        if (scannedAsset.error || !scannedAsset.metadata.isSupported) {
          continue;
        }

        try {
          const parsedAsset = await parser.parse(scannedAsset.metadata);
          
          if (parsedAsset.error) {
            continue;
          }

          // Process through Knowledge Brain
          const knowledgeAsset = processAsset({
            title: scannedAsset.metadata.name,
            content: parsedAsset.content,
            category: scannedAsset.metadata.category || "General",
            metadata: {
              language: scannedAsset.metadata.language,
            },
          });

          // Add asset index entry
          assetIndexEntries.push({
            id: knowledgeAsset.id,
            path: scannedAsset.metadata.relativePath,
            category: knowledgeAsset.category,
            extension: scannedAsset.metadata.extension,
            size: scannedAsset.metadata.size,
            checksum: scannedAsset.metadata.checksum,
            modifiedAt: scannedAsset.metadata.modifiedAt,
            language: knowledgeAsset.metadata.language,
          });

          // Add entity index entries
          for (const entity of knowledgeAsset.entities) {
            entityIndexEntries.push({
              assetId: knowledgeAsset.id,
              entityType: entity.type,
              entityValue: entity.value,
              confidence: entity.confidence,
              occurrences: entity.occurrences,
            });
          }

          // Add relationship index entries
          for (const relationship of knowledgeAsset.relationships) {
            relationshipIndexEntries.push({
              assetId: knowledgeAsset.id,
              relationshipType: relationship.type,
              subject: relationship.subject,
              object: relationship.object,
              confidence: relationship.confidence,
            });
          }

          // Update category statistics
          const categoryStats = categoryMap.get(knowledgeAsset.category) || { count: 0, totalSize: 0 };
          categoryStats.count++;
          categoryStats.totalSize += scannedAsset.metadata.size;
          categoryMap.set(knowledgeAsset.category, categoryStats);

        } catch (error) {
          console.error(`Error processing ${scannedAsset.metadata.path}:`, error);
        }
      }

      // Generate category index entries
      const categoryIndexEntries = Array.from(categoryMap.entries()).map(
        ([category, stats]) => ({
          category,
          assetCount: stats.count,
          totalSize: stats.totalSize,
        })
      );

      // Generate statistics
      const statistics = {
        totalAssets: assetIndexEntries.length,
        totalEntities: entityIndexEntries.length,
        totalRelationships: relationshipIndexEntries.length,
        totalCategories: categoryIndexEntries.length,
        byCategory: Object.fromEntries(categoryMap.entries()),
        byExtension: assetIndexEntries.reduce((acc: Record<string, number>, entry: { extension: string }) => {
          acc[entry.extension] = (acc[entry.extension] || 0) + 1;
          return acc;
        }, {}),
        byLanguage: assetIndexEntries.reduce((acc: Record<string, number>, entry: { language: string }) => {
          acc[entry.language] = (acc[entry.language] || 0) + 1;
          return acc;
        }, {}),
        generatedAt: new Date().toISOString(),
      };

      // Write CSV files
      await outputFs.writeFile(`${outputPath}/assets.csv`, generateAssetsCsv(assetIndexEntries));
      await outputFs.writeFile(`${outputPath}/entities.csv`, generateEntitiesCsv(entityIndexEntries));
      await outputFs.writeFile(`${outputPath}/relationships.csv`, generateRelationshipsCsv(relationshipIndexEntries));
      await outputFs.writeFile(`${outputPath}/categories.csv`, generateCategoriesCsv(categoryIndexEntries));
      await outputFs.writeFile(`${outputPath}/statistics.json`, JSON.stringify(statistics, null, 2));

      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] Indexes rebuilt in ${duration}ms`);
      console.log(`  Assets: ${statistics.totalAssets}`);
      console.log(`  Entities: ${statistics.totalEntities}`);
      console.log(`  Relationships: ${statistics.totalRelationships}`);
      console.log(`  Categories: ${statistics.totalCategories}`);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error rebuilding indexes:`, error);
    }
  }

  // CSV generation helpers
  function generateAssetsCsv(entries: readonly AssetIndexEntry[]): string {
    const headers = "id,path,category,extension,size,checksum,modifiedAt,language";
    const rows = entries.map(
      (e) => `${e.id},"${e.path}","${e.category}",${e.extension},${e.size},${e.checksum},${e.modifiedAt},${e.language}`
    );
    return [headers, ...rows].join("\n");
  }

  function generateEntitiesCsv(entries: readonly EntityIndexEntry[]): string {
    const headers = "assetId,entityType,entityValue,confidence,occurrences";
    const rows = entries.map(
      (e) => `${e.assetId},${e.entityType},"${e.entityValue}",${e.confidence},${e.occurrences}`
    );
    return [headers, ...rows].join("\n");
  }

  function generateRelationshipsCsv(entries: readonly RelationshipIndexEntry[]): string {
    const headers = "assetId,relationshipType,subject,object,confidence";
    const rows = entries.map(
      (e) => `${e.assetId},${e.relationshipType},"${e.subject}","${e.object}",${e.confidence}`
    );
    return [headers, ...rows].join("\n");
  }

  function generateCategoriesCsv(entries: readonly CategoryIndexEntry[]): string {
    const headers = "category,assetCount,totalSize";
    const rows = entries.map(
      (e) => `"${e.category}",${e.assetCount},${e.totalSize}`
    );
    return [headers, ...rows].join("\n");
  }

  // Set up file watcher
  console.log(`Setting up file watcher with ${options.debounceMs}ms debounce...`);
  
  const watcher = chokidar.watch(assetsPath, {
    ignored: options.ignorePatterns,
    persistent: true,
    ignoreInitial: options.ignoreInitial,
  });

  watcher
    .on("add", (path) => {
      console.log(`[${new Date().toISOString()}] File added: ${path}`);
      scheduleRebuild();
    })
    .on("change", (path) => {
      console.log(`[${new Date().toISOString()}] File changed: ${path}`);
      scheduleRebuild();
    })
    .on("unlink", (path) => {
      console.log(`[${new Date().toISOString()}] File deleted: ${path}`);
      scheduleRebuild();
    })
    .on("addDir", (path) => {
      console.log(`[${new Date().toISOString()}] Directory added: ${path}`);
      scheduleRebuild();
    })
    .on("unlinkDir", (path) => {
      console.log(`[${new Date().toISOString()}] Directory deleted: ${path}`);
      scheduleRebuild();
    })
    .on("error", (error) => {
      console.error(`[${new Date().toISOString()}] Watcher error:`, error);
    });

  // Initial build
  if (!options.ignoreInitial) {
    console.log("Performing initial index build...");
    await rebuildIndexes();
  }

  console.log(`\nWatching for changes in: ${assetsPath}`);
  console.log("Press Ctrl+C to stop watching");

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\nStopping file watcher...");
    watcher.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Error starting file watcher:", error);
  process.exit(1);
});
