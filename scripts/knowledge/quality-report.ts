#!/usr/bin/env node

// ─── Quality Report Script ─────────────────────────────────────────────────────────

import { FileSystem } from "../../src/lib/knowledge/importer/filesystem";
import { AssetScanner } from "../../src/lib/knowledge/importer/scanner";
import { AssetParser } from "../../src/lib/knowledge/importer/parser";
import { AssetValidator } from "../../src/lib/knowledge/importer/validator";
import { QualityReporter } from "../../src/lib/knowledge/importer/reporter";
import type { ValidatorOptions } from "../../src/lib/knowledge/importer/types";

/**
 * Generate quality reports for knowledge assets.
 */
async function main() {
  const assetsPath = process.argv[2] || "knowledge/assets";
  const outputPath = process.argv[3] || "knowledge/reports";

  console.log(`Generating quality report for: ${assetsPath}`);
  console.log(`Output directory: ${outputPath}`);

  const fs = new FileSystem(assetsPath);

  // Check if directory exists
  if (!(await fs.exists(assetsPath))) {
    console.error(`Error: Directory does not exist: ${assetsPath}`);
    process.exit(1);
  }

  const scanner = new AssetScanner(fs);
  const parser = new AssetParser(fs);
  const validator = new AssetValidator(fs);
  const reporter = new QualityReporter(fs);
  const outputFs = new FileSystem(".");

  // Create output directory
  await outputFs.createDirectory(outputPath);

  const options: ValidatorOptions = {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    requiredFields: [],
    checkDuplicates: true,
    checkEncoding: true,
  };

  const startTime = Date.now();

  // Scan assets
  console.log("Scanning assets...");
  const scannedAssets = await scanner.scan(assetsPath, {
    recursive: true,
    excludePatterns: ["node_modules", ".git", ".next"],
  });

  // Parse assets for validation
  console.log("Parsing assets for validation...");
  const assetsForValidation: Array<{
    metadata: FileMetadata;
    content: string;
  }> = [];

  for (const scannedAsset of scannedAssets) {
    if (scannedAsset.error || !scannedAsset.metadata.isSupported) {
      continue;
    }

    try {
      const parsedAsset = await parser.parse(scannedAsset.metadata);
      
      if (parsedAsset.error) {
        continue;
      }

      assetsForValidation.push({
        metadata: scannedAsset.metadata,
        content: parsedAsset.content,
      });
    } catch (error) {
      console.error(`Error processing ${scannedAsset.metadata.path}:`, error);
    }
  }

  // Validate assets
  console.log("Validating assets...");
  const qualityReport = await validator.validateBatch(assetsForValidation, options);

  const duration = Date.now() - startTime;

  // Generate reports
  console.log("Generating reports...");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  
  await reporter.generateReport(qualityReport, `${outputPath}/quality-report-${timestamp}.json`);
  
  const markdownReport = reporter.generateMarkdownReport(qualityReport);
  await outputFs.writeFile(`${outputPath}/quality-report-${timestamp}.md`, markdownReport);
  
  const csvReport = reporter.generateCsvReport(qualityReport);
  await outputFs.writeFile(`${outputPath}/quality-report-${timestamp}.csv`, csvReport);

  console.log(`\nQuality report generation complete in ${duration}ms`);
  console.log(`Total assets: ${qualityReport.totalAssets}`);
  console.log(`Passed: ${qualityReport.passedAssets}`);
  console.log(`Failed: ${qualityReport.failedAssets}`);
  console.log(`Warnings: ${qualityReport.warningCount}`);
  console.log(`Errors: ${qualityReport.errorCount}`);
  console.log(`\nIssues found:`);
  console.log(`  Missing metadata: ${qualityReport.missingMetadata.length}`);
  console.log(`  Duplicate files: ${qualityReport.duplicateFiles.length}`);
  console.log(`  Broken files: ${qualityReport.brokenFiles.length}`);
  console.log(`  Unreadable files: ${qualityReport.unreadableFiles.length}`);
  console.log(`  Unsupported extensions: ${qualityReport.unsupportedExtensions.length}`);
  console.log(`  Duplicate hashes: ${qualityReport.duplicateHashes.length}`);
  console.log(`  Oversized files: ${qualityReport.oversizedFiles.length}`);
  console.log(`\nOutput directory: ${outputPath}`);
  console.log(`Reports:`);
  console.log(`  - quality-report-${timestamp}.json`);
  console.log(`  - quality-report-${timestamp}.md`);
  console.log(`  - quality-report-${timestamp}.csv`);
}

main().catch((error) => {
  console.error("Error during quality report generation:", error);
  process.exit(1);
});
