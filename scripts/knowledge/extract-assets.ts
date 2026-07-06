#!/usr/bin/env node

// ─── Extract Assets Script ─────────────────────────────────────────────────────────

import { FileSystem } from "../../src/lib/knowledge/importer/filesystem";
import { AssetScanner } from "../../src/lib/knowledge/importer/scanner";
import { AssetParser } from "../../src/lib/knowledge/importer/parser";
import type { ParserOptions } from "../../src/lib/knowledge/importer/types";

/**
 * Extract raw text content from supported file formats.
 */
async function main() {
  const assetsPath = process.argv[2] || "knowledge/assets";
  const outputPath = process.argv[3] || "knowledge/extracted";

  console.log(`Extracting assets from: ${assetsPath}`);
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

  const options: ParserOptions = {
    encoding: "utf-8",
    maxFileSize: 50 * 1024 * 1024, // 50MB
    preserveFormatting: false,
  };

  const startTime = Date.now();

  // Scan assets
  console.log("Scanning assets...");
  const scannedAssets = await scanner.scan(assetsPath, {
    recursive: true,
    excludePatterns: ["node_modules", ".git", ".next"],
  });

  // Extract content
  console.log("Extracting content from supported files...");
  let extractedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const scannedAsset of scannedAssets) {
    if (scannedAsset.error) {
      console.warn(`Skipping asset with error: ${scannedAsset.metadata.path}`);
      skippedCount++;
      continue;
    }

    if (!scannedAsset.metadata.isSupported) {
      console.log(`Skipping unsupported file: ${scannedAsset.metadata.path}`);
      skippedCount++;
      continue;
    }

    try {
      const parsedAsset = await parser.parse(scannedAsset.metadata, options);
      
      if (parsedAsset.error) {
        console.warn(`Parse error for ${scannedAsset.metadata.path}: ${parsedAsset.error}`);
        errorCount++;
        continue;
      }

      // Determine output file path
      const relativePath = scannedAsset.metadata.relativePath;
      const outputPathWithoutExt = relativePath.replace(/\.[^/.]+$/, "");
      const outputFilePath = `${outputPath}/${outputPathWithoutExt}.txt`;

      // Write extracted content
      await outputFs.writeFile(outputFilePath, parsedAsset.content);
      extractedCount++;
      console.log(`Extracted: ${relativePath}`);
    } catch (error) {
      console.error(`Error processing ${scannedAsset.metadata.path}:`, error);
      errorCount++;
    }
  }

  const duration = Date.now() - startTime;

  // Prepare results
  const results = {
    extractedAt: new Date().toISOString(),
    durationMs: duration,
    totalAssets: scannedAssets.length,
    extractedCount,
    skippedCount,
    errorCount,
    outputPath,
  };

  // Write summary to output directory
  await outputFs.writeFile(`${outputPath}/extraction-summary.json`, JSON.stringify(results, null, 2));

  console.log(`\nExtraction complete in ${duration}ms`);
  console.log(`Total assets scanned: ${results.totalAssets}`);
  console.log(`Successfully extracted: ${extractedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Output directory: ${outputPath}`);
}

main().catch((error) => {
  console.error("Error during extraction:", error);
  process.exit(1);
});
