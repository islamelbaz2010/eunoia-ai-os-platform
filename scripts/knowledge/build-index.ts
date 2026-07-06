#!/usr/bin/env node

// ─── Build Index Script ────────────────────────────────────────────────────────────

import { FileSystem } from "../../src/lib/knowledge/importer/filesystem";
import { AssetScanner } from "../../src/lib/knowledge/importer/scanner";
import { AssetParser } from "../../src/lib/knowledge/importer/parser";
import { processAsset } from "../../src/lib/knowledge/knowledge";
import type { IndexStatistics, AssetIndexEntry, EntityIndexEntry, RelationshipIndexEntry, CategoryIndexEntry } from "../../src/lib/knowledge/importer/types";

/**
 * Generate knowledge indexes from scanned assets.
 */
async function main() {
  const assetsPath = process.argv[2] || "knowledge/assets";
  const outputPath = process.argv[3] || "knowledge/index";

  console.log(`Building indexes from: ${assetsPath}`);
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

  const startTime = Date.now();

  // Scan assets
  console.log("Scanning assets...");
  const scannedAssets = await scanner.scan(assetsPath, {
    recursive: true,
    excludePatterns: ["node_modules", ".git", ".next"],
  });

  // Process assets
  console.log("Processing assets through Knowledge Brain...");
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

  const duration = Date.now() - startTime;

  // Generate category index entries
  const categoryIndexEntries: CategoryIndexEntry[] = Array.from(categoryMap.entries()).map(
    ([category, stats]) => ({
      category,
      assetCount: stats.count,
      totalSize: stats.totalSize,
    })
  );

  // Generate statistics
  const statistics: IndexStatistics = {
    totalAssets: assetIndexEntries.length,
    totalEntities: entityIndexEntries.length,
    totalRelationships: relationshipIndexEntries.length,
    totalCategories: categoryIndexEntries.length,
    byCategory: Object.fromEntries(categoryMap.entries()),
    byExtension: assetIndexEntries.reduce((acc: Record<string, number>, entry) => {
      acc[entry.extension] = (acc[entry.extension] || 0) + 1;
      return acc;
    }, {}),
    byLanguage: assetIndexEntries.reduce((acc: Record<string, number>, entry) => {
      acc[entry.language] = (acc[entry.language] || 0) + 1;
      return acc;
    }, {}),
    generatedAt: new Date().toISOString(),
  };

  // Write CSV files
  console.log("Writing CSV files...");
  await outputFs.writeFile(`${outputPath}/assets.csv`, generateAssetsCsv(assetIndexEntries));
  await outputFs.writeFile(`${outputPath}/entities.csv`, generateEntitiesCsv(entityIndexEntries));
  await outputFs.writeFile(`${outputPath}/relationships.csv`, generateRelationshipsCsv(relationshipIndexEntries));
  await outputFs.writeFile(`${outputPath}/categories.csv`, generateCategoriesCsv(categoryIndexEntries));
  await outputFs.writeFile(`${outputPath}/statistics.json`, JSON.stringify(statistics, null, 2));

  console.log(`\nIndex building complete in ${duration}ms`);
  console.log(`Total assets: ${statistics.totalAssets}`);
  console.log(`Total entities: ${statistics.totalEntities}`);
  console.log(`Total relationships: ${statistics.totalRelationships}`);
  console.log(`Total categories: ${statistics.totalCategories}`);
  console.log(`Output directory: ${outputPath}`);
}

/**
 * Generate CSV for assets index.
 */
function generateAssetsCsv(entries: readonly AssetIndexEntry[]): string {
  const headers = "id,path,category,extension,size,checksum,modifiedAt,language";
  const rows = entries.map(
    (e) => `${e.id},"${e.path}","${e.category}",${e.extension},${e.size},${e.checksum},${e.modifiedAt},${e.language}`
  );
  return [headers, ...rows].join("\n");
}

/**
 * Generate CSV for entities index.
 */
function generateEntitiesCsv(entries: readonly EntityIndexEntry[]): string {
  const headers = "assetId,entityType,entityValue,confidence,occurrences";
  const rows = entries.map(
    (e) => `${e.assetId},${e.entityType},"${e.entityValue}",${e.confidence},${e.occurrences}`
  );
  return [headers, ...rows].join("\n");
}

/**
 * Generate CSV for relationships index.
 */
function generateRelationshipsCsv(entries: readonly RelationshipIndexEntry[]): string {
  const headers = "assetId,relationshipType,subject,object,confidence";
  const rows = entries.map(
    (e) => `${e.assetId},${e.relationshipType},"${e.subject}","${e.object}",${e.confidence}`
  );
  return [headers, ...rows].join("\n");
}

/**
 * Generate CSV for categories index.
 */
function generateCategoriesCsv(entries: readonly CategoryIndexEntry[]): string {
  const headers = "category,assetCount,totalSize";
  const rows = entries.map(
    (e) => `"${e.category}",${e.assetCount},${e.totalSize}`
  );
  return [headers, ...rows].join("\n");
}

main().catch((error) => {
  console.error("Error during index building:", error);
  process.exit(1);
});
