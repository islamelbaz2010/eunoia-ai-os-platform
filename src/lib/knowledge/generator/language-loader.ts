/**
 * Language Loader — loads and queries the languages.json registry.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Language } from './types';

interface LanguagesFile {
  version: string;
  totalLanguages: number;
  languages: Language[];
}

let loaded: Language[] | null = null;

const DATA_PATH = path.join(import.meta.dirname, 'data', 'languages.json');

async function ensureLoaded(): Promise<Language[]> {
  if (loaded) return loaded;
  const raw = await readFile(DATA_PATH, 'utf8');
  const file = JSON.parse(raw) as LanguagesFile;
  loaded = file.languages;
  return loaded;
}

/** Return all languages (enabled and disabled). */
export async function loadAllLanguages(): Promise<Language[]> {
  return ensureLoaded();
}

/** Return only enabled languages. */
export async function loadEnabledLanguages(): Promise<Language[]> {
  const all = await ensureLoaded();
  return all.filter((l) => l.enabled);
}

/** Return a single language by BCP-47 code. Throws if not found. */
export async function loadLanguage(code: string): Promise<Language> {
  const all = await ensureLoaded();
  const language = all.find((l) => l.code === code);
  if (!language) throw new Error(`Language not found: ${code}`);
  return language;
}

/** Return whether a language code is valid. */
export async function isValidLanguage(code: string): Promise<boolean> {
  const all = await ensureLoaded();
  return all.some((l) => l.code === code);
}

/** Clear in-memory cache (used in tests). */
export function clearLanguageCache(): void {
  loaded = null;
}
