#!/usr/bin/env node

// ─── Scan Assets Script ───────────────────────────────────────────────────────────

import { FileSystem } from "../../src/lib/knowledge/importer/filesystem";
import { AssetScanner } from "../../src/lib/knowledge/importer/scanner";
import type { ScanOptions, ScannedAsset } from "../../src/lib/knowledge/importer/types";

/**
 * Scan the knowledge/assets directory and collect metadata.
 */
async function main() {
  const assetsPath = process.argv[2] || "knowledge/assets";
  const outputPath = process.argv[3] || "knowledge/cache/scan-results.json";

  console.log(`Scanning assets from: ${assetsPath}`);

  const fs = new FileSystem(assetsPath);

  // Check if directory exists
  if (!(await fs.exists(assetsPath))) {
    console.error(`Error: Directory does not exist: ${assetsPath}`);
    process.exit(1);
  }

  const scanner = new AssetScanner(fs);

  const options: ScanOptions = {
    recursive: true,
    includePatterns: [],
    excludePatterns: ["node_modules", ".git", ".next"],
    maxDepth: Infinity,
    followSymlinks: false,
  };

  const startTime = Date.now();
  const scannedAssets = await scanner.scan(assetsPath, options);
  const duration = Date.now() - startTime;

  // Prepare results
  const results = {
    scannedAt: new Date().toISOString(),
    durationMs: duration,
    totalAssets: scannedAssets.length,
    successfulScans: scannedAssets.filter((a: ScannedAsset) => a.error === null).length,
    failedScans: scannedAssets.filter((a: ScannedAsset) => a.error !== null).length,
    assets: scannedAssets.map((asset: ScannedAsset) => ({
      path: asset.metadata.relativePath,
      name: asset.metadata.name,
      extension: asset.metadata.extension,
      size: asset.metadata.size,
      checksum: asset.metadata.checksum,
      mimeType: asset.metadata.mimeType,
      language: asset.metadata.language,
      category: asset.metadata.category,
      isSupported: asset.metadata.isSupported,
      modifiedAt: asset.metadata.modifiedAt,
      error: asset.error,
    })),
  };

  // Write results to output file
  const outputFs = new FileSystem(".");
  await outputFs.createDirectory("knowledge/cache");
  await outputFs.writeFile(outputPath, JSON.stringify(results, null, 2));

  console.log(`Scan complete in ${duration}ms`);
  console.log(`Total assets: ${results.totalAssets}`);
  console.log(`Successful: ${results.successfulScans}`);
  console.log(`Failed: ${results.failedScans}`);
  console.log(`Results written to: ${outputPath}`);
}

main().catch((error) => {
  console.error("Error during scan:", error);
  process.exit(1);
});
