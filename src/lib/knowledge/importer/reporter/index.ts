// ─── Reporter Module ─────────────────────────────────────────────────────────────

import type { QualityReport } from "../types";
import { FileSystem } from "../filesystem";

export { QualityReporter };

/**
 * Reporter for generating quality reports and statistics.
 */
class QualityReporter {
  private readonly fs: FileSystem;

  constructor(fs: FileSystem) {
    this.fs = fs;
  }

  /**
   * Generate a quality report and save it to disk.
   */
  async generateReport(
    report: QualityReport,
    outputPath: string
  ): Promise<void> {
    const jsonReport = JSON.stringify(report, null, 2);
    await this.fs.writeFile(outputPath, jsonReport);
  }

  /**
   * Generate a markdown summary of the quality report.
   */
  generateMarkdownReport(report: QualityReport): string {
    const lines: string[] = [];

    lines.push("# Knowledge Asset Quality Report");
    lines.push("");
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push("");

    // Summary
    lines.push("## Summary");
    lines.push("");
    lines.push(`- Total Assets: ${report.totalAssets}`);
    lines.push(`- Passed: ${report.passedAssets}`);
    lines.push(`- Failed: ${report.failedAssets}`);
    lines.push(`- Warnings: ${report.warningCount}`);
    lines.push(`- Errors: ${report.errorCount}`);
    lines.push("");

    // Coverage Statistics
    lines.push("## Coverage Statistics");
    lines.push("");
    lines.push("### By Category");
    for (const [category, count] of Object.entries(
      report.coverageStatistics.byCategory
    )) {
      lines.push(`- ${category}: ${count}`);
    }
    lines.push("");

    lines.push("### By Extension");
    for (const [extension, count] of Object.entries(
      report.coverageStatistics.byExtension
    )) {
      lines.push(`- ${extension}: ${count}`);
    }
    lines.push("");

    lines.push("### By Language");
    for (const [language, count] of Object.entries(
      report.coverageStatistics.byLanguage
    )) {
      lines.push(`- ${language}: ${count}`);
    }
    lines.push("");

    lines.push("### File Size Statistics");
    lines.push(`- Total Size: ${this.formatBytes(report.coverageStatistics.totalSize)}`);
    lines.push(`- Average Size: ${this.formatBytes(report.coverageStatistics.averageFileSize)}`);
    lines.push("");

    // Issues
    lines.push("## Issues");
    lines.push("");

    if (report.missingMetadata.length > 0) {
      lines.push("### Missing Metadata");
      for (const path of report.missingMetadata) {
        lines.push(`- ${path}`);
      }
      lines.push("");
    }

    if (report.duplicateFiles.length > 0) {
      lines.push("### Duplicate Files");
      for (const path of report.duplicateFiles) {
        lines.push(`- ${path}`);
      }
      lines.push("");
    }

    if (report.brokenFiles.length > 0) {
      lines.push("### Broken Files");
      for (const path of report.brokenFiles) {
        lines.push(`- ${path}`);
      }
      lines.push("");
    }

    if (report.unreadableFiles.length > 0) {
      lines.push("### Unreadable Files");
      for (const path of report.unreadableFiles) {
        lines.push(`- ${path}`);
      }
      lines.push("");
    }

    if (report.unsupportedExtensions.length > 0) {
      lines.push("### Unsupported Extensions");
      for (const path of report.unsupportedExtensions) {
        lines.push(`- ${path}`);
      }
      lines.push("");
    }

    if (report.duplicateHashes.length > 0) {
      lines.push("### Duplicate Hashes");
      for (const path of report.duplicateHashes) {
        lines.push(`- ${path}`);
      }
      lines.push("");
    }

    if (report.oversizedFiles.length > 0) {
      lines.push("### Oversized Files");
      for (const path of report.oversizedFiles) {
        lines.push(`- ${path}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Generate a CSV summary of the quality report.
   */
  generateCsvReport(report: QualityReport): string {
    const lines: string[] = [];

    lines.push("metric,value");
    lines.push(`total_assets,${report.totalAssets}`);
    lines.push(`passed_assets,${report.passedAssets}`);
    lines.push(`failed_assets,${report.failedAssets}`);
    lines.push(`warning_count,${report.warningCount}`);
    lines.push(`error_count,${report.errorCount}`);
    lines.push(`missing_metadata_count,${report.missingMetadata.length}`);
    lines.push(`duplicate_files_count,${report.duplicateFiles.length}`);
    lines.push(`broken_files_count,${report.brokenFiles.length}`);
    lines.push(`unreadable_files_count,${report.unreadableFiles.length}`);
    lines.push(`unsupported_extensions_count,${report.unsupportedExtensions.length}`);
    lines.push(`duplicate_hashes_count,${report.duplicateHashes.length}`);
    lines.push(`oversized_files_count,${report.oversizedFiles.length}`);
    lines.push(`total_size_bytes,${report.coverageStatistics.totalSize}`);
    lines.push(`average_file_size_bytes,${Math.round(report.coverageStatistics.averageFileSize)}`);

    return lines.join("\n");
  }

  /**
   * Format bytes to human-readable string.
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }
}
