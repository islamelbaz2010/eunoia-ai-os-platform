#!/usr/bin/env node

// ─── Classify Assets Script ─────────────────────────────────────────────────────────

import { FileSystem } from "../../src/lib/knowledge/importer/filesystem";
import { AssetScanner } from "../../src/lib/knowledge/importer/scanner";
import { AssetParser } from "../../src/lib/knowledge/importer/parser";
import { AssetClassifier } from "../../src/lib/knowledge/importer/classifier";
import type { ClassifierOptions } from "../../src/lib/knowledge/importer/types";

/**
 * Classify assets into knowledge categories.
 */
async function main() {
  const assetsPath = process.argv[2] || "knowledge/assets";
  const outputPath = process.argv[3] || "knowledge/cache/classified-assets.json";

  console.log(`Classifying assets from: ${assetsPath}`);

  const fs = new FileSystem(assetsPath);

  // Check if directory exists
  if (!(await fs.exists(assetsPath))) {
    console.error(`Error: Directory does not exist: ${assetsPath}`);
    process.exit(1);
  }

  const scanner = new AssetScanner(fs);
  const parser = new AssetParser(fs);
  const classifier = new AssetClassifier();

  const options: ClassifierOptions = {
    threshold: 0.3,
    useKeywords: true,
    usePathHints: true,
  };

  const startTime = Date.now();

  // Scan assets
  console.log("Scanning assets...");
  const scannedAssets = await scanner.scan(assetsPath, {
    recursive: true,
    excludePatterns: ["node_modules", ".git", ".next"],
  });

  // Parse and classify
  console.log("Parsing and classifying assets...");
  const classifiedAssets: Array<{
    path: string;
    name: string;
    extension: string;
    category: string;
    confidence: number;
    size: number;
    language: string;
  }> = [];

  for (const scannedAsset of scannedAssets) {
    if (scannedAsset.error) {
      console.warn(`Skipping asset with error: ${scannedAsset.metadata.path}`);
      continue;
    }

    if (!scannedAsset.metadata.isSupported) {
      console.warn(`Skipping unsupported file: ${scannedAsset.metadata.path}`);
      continue;
    }

    try {
      const parsedAsset = await parser.parse(scannedAsset.metadata);
      
      if (parsedAsset.error) {
        console.warn(`Parse error for ${scannedAsset.metadata.path}: ${parsedAsset.error}`);
        continue;
      }

      const classifiedAsset = classifier.classify(
        scannedAsset.metadata,
        parsedAsset.content,
        options
      );

      classifiedAssets.push({
        path: classifiedAsset.metadata.relativePath,
        name: classifiedAsset.metadata.name,
        extension: classifiedAsset.metadata.extension,
        category: classifiedAsset.category,
        confidence: classifiedAsset.confidence,
        size: classifiedAsset.metadata.size,
        language: classifiedAsset.metadata.language,
      });
    } catch (error) {
      console.error(`Error processing ${scannedAsset.metadata.path}:`, error);
    }
  }

  const duration = Date.now() - startTime;

  // Prepare results
  const results = {
    classifiedAt: new Date().toISOString(),
    durationMs: duration,
    totalAssets: scannedAssets.length,
    classifiedAssets: classifiedAssets.length,
    byCategory: classifiedAssets.reduce((acc: Record<string, number>, asset: { category: string }) => {
      acc[asset.category] = (acc[asset.category] || 0) + 1;
      return acc;
    }, {}),
    assets: classifiedAssets,
  };

  // Write results to output file
  const outputFs = new FileSystem(".");
  await outputFs.createDirectory("knowledge/cache");
  await outputFs.writeFile(outputPath, JSON.stringify(results, null, 2));

  console.log(`Classification complete in ${duration}ms`);
  console.log(`Total assets scanned: ${results.totalAssets}`);
  console.log(`Assets classified: ${results.classifiedAssets}`);
  console.log(`Results written to: ${outputPath}`);

  // Print category distribution
  console.log("\nCategory distribution:");
  for (const [category, count] of Object.entries(results.byCategory)) {
    console.log(`  ${category}: ${count}`);
  }
}

main().catch((error) => {
  console.error("Error during classification:", error);
  process.exit(1);
});
