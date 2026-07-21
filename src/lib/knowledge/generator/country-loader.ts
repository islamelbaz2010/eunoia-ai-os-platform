/**
 * Country Loader — loads and queries the countries.json registry.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Country, IndustryId } from './types';

interface CountriesFile {
  version: string;
  totalCountries: number;
  countries: Country[];
}

let loaded: Country[] | null = null;

const DATA_PATH = path.join(import.meta.dirname, 'data', 'countries.json');

async function ensureLoaded(): Promise<Country[]> {
  if (loaded) return loaded;
  const raw = await readFile(DATA_PATH, 'utf8');
  const file = JSON.parse(raw) as CountriesFile;
  loaded = file.countries;
  return loaded;
}

/** Return all countries (enabled and disabled). */
export async function loadAllCountries(): Promise<Country[]> {
  return ensureLoaded();
}

/** Return only enabled countries. */
export async function loadEnabledCountries(): Promise<Country[]> {
  const all = await ensureLoaded();
  return all.filter((c) => c.enabled);
}

/** Return a single country by ISO 3166-1 alpha-2 code. Throws if not found. */
export async function loadCountry(code: string): Promise<Country> {
  const all = await ensureLoaded();
  const country = all.find((c) => c.code === code);
  if (!country) throw new Error(`Country not found: ${code}`);
  return country;
}

/** Return countries that support a given industry. */
export async function loadCountriesForIndustry(industryId: IndustryId): Promise<Country[]> {
  const all = await ensureLoaded();
  return all.filter((c) => c.enabled && c.industries.includes(industryId));
}

/** Return whether a country code is valid. */
export async function isValidCountry(code: string): Promise<boolean> {
  const all = await ensureLoaded();
  return all.some((c) => c.code === code);
}

/** Clear in-memory cache (used in tests). */
export function clearCountryCache(): void {
  loaded = null;
}
