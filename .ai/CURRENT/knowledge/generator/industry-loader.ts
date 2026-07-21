/**
 * Industry Loader — loads and queries the industries.json registry.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Industry, IndustryId } from './types.js';

interface IndustriesFile {
  version: string;
  totalIndustries: number;
  industries: Industry[];
}

let loaded: Industry[] | null = null;

function registryPath(): string {
  return path.resolve(__dirname, 'industries.json');
}

async function ensureLoaded(): Promise<Industry[]> {
  if (loaded) return loaded;
  const raw = await readFile(registryPath(), 'utf8');
  const file = JSON.parse(raw) as IndustriesFile;
  loaded = file.industries;
  return loaded;
}

/** Return all industries (enabled and disabled). */
export async function loadAllIndustries(): Promise<Industry[]> {
  return ensureLoaded();
}

/** Return only enabled industries. */
export async function loadEnabledIndustries(): Promise<Industry[]> {
  const all = await ensureLoaded();
  return all.filter((i) => i.enabled);
}

/** Return a single industry by id. Throws if not found. */
export async function loadIndustry(id: IndustryId): Promise<Industry> {
  const all = await ensureLoaded();
  const industry = all.find((i) => i.id === id);
  if (!industry) throw new Error(`Industry not found: ${id}`);
  return industry;
}

/** Return whether an industry id is valid. */
export async function isValidIndustry(id: string): Promise<boolean> {
  const all = await ensureLoaded();
  return all.some((i) => i.id === id);
}

/** Return all valid industry IDs. */
export async function listIndustryIds(): Promise<IndustryId[]> {
  const all = await ensureLoaded();
  return all.map((i) => i.id);
}

/** Clear in-memory cache (used in tests). */
export function clearCache(): void {
  loaded = null;
}
