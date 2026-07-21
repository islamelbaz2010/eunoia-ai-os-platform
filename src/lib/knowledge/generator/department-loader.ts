/**
 * Department Loader — loads and queries the departments.json registry.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Department, DepartmentId } from './types';

interface DepartmentsFile {
  version: string;
  totalDepartments: number;
  departments: Department[];
}

let loaded: Department[] | null = null;

const DATA_PATH = path.join(import.meta.dirname, 'data', 'departments.json');

async function ensureLoaded(): Promise<Department[]> {
  if (loaded) return loaded;
  const raw = await readFile(DATA_PATH, 'utf8');
  const file = JSON.parse(raw) as DepartmentsFile;
  loaded = file.departments;
  return loaded;
}

/** Return all departments (enabled and disabled). */
export async function loadAllDepartments(): Promise<Department[]> {
  return ensureLoaded();
}

/** Return only enabled departments. */
export async function loadEnabledDepartments(): Promise<Department[]> {
  const all = await ensureLoaded();
  return all.filter((d) => d.enabled);
}

/** Return a single department by id. Throws if not found. */
export async function loadDepartment(id: DepartmentId): Promise<Department> {
  const all = await ensureLoaded();
  const department = all.find((d) => d.id === id);
  if (!department) throw new Error(`Department not found: ${id}`);
  return department;
}

/** Return whether a department id is valid. */
export async function isValidDepartment(id: string): Promise<boolean> {
  const all = await ensureLoaded();
  return all.some((d) => d.id === id);
}

/** Return all valid department IDs. */
export async function listDepartmentIds(): Promise<DepartmentId[]> {
  const all = await ensureLoaded();
  return all.map((d) => d.id);
}

/** Clear in-memory cache (used in tests). */
export function clearDepartmentCache(): void {
  loaded = null;
}
