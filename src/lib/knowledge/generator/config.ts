/**
 * Config Loader — loads generator.config.json and resolves all paths to absolute.
 *
 * All relative paths in the config are resolved relative to process.cwd()
 * (the project root), making the pipeline portable across environments.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { GeneratorConfig } from './types';

const DEFAULT_CONFIG_PATH = path.join(import.meta.dirname, 'generator.config.json');

/**
 * Load and return the generator configuration.
 * Resolves all path fields to absolute paths relative to process.cwd().
 *
 * @param configPath - Absolute path to the config JSON file. Defaults to
 *   the bundled generator.config.json co-located with this module.
 */
export function loadConfig(configPath?: string): GeneratorConfig {
  const filePath = configPath ?? DEFAULT_CONFIG_PATH;
  const raw = readFileSync(filePath, 'utf8');
  const config = JSON.parse(raw) as GeneratorConfig;

  const cwd = process.cwd();

  return {
    ...config,
    knowledgeRoot: path.resolve(cwd, config.knowledgeRoot),
    packRoot: path.resolve(cwd, config.packRoot),
    schemasRoot: path.resolve(cwd, config.schemasRoot),
    output: {
      ...config.output,
      quarantinePath: path.resolve(cwd, config.output.quarantinePath),
      logPath: path.resolve(cwd, config.output.logPath),
      reportPath: path.resolve(cwd, config.output.reportPath),
    },
  };
}

/** Merge CLI overrides into the loaded config. */
export function applyOverrides(
  config: GeneratorConfig,
  overrides: {
    dryRun?: boolean;
    overwrite?: boolean;
    language?: string;
    country?: string;
  }
): GeneratorConfig {
  return {
    ...config,
    generation: {
      ...config.generation,
      ...(overrides.dryRun !== undefined && { dryRun: overrides.dryRun }),
      ...(overrides.language !== undefined && { defaultLanguage: overrides.language }),
      ...(overrides.country !== undefined && { defaultCountry: overrides.country }),
    },
    output: {
      ...config.output,
      ...(overrides.overwrite !== undefined && { overwriteExisting: overrides.overwrite }),
    },
  };
}
