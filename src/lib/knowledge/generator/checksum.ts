/**
 * Checksum utilities for the Knowledge Generation Pipeline.
 * Uses Node.js built-in crypto — no external dependencies.
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const ALGORITHM = 'sha256';
const PREFIX = 'sha256:';
const EMPTY_CHECKSUM = `${PREFIX}${'0'.repeat(64)}`;

/** Compute SHA-256 of a UTF-8 string. Returns prefixed hex string. */
export function checksumString(content: string): string {
  return PREFIX + createHash(ALGORITHM).update(content, 'utf8').digest('hex');
}

/** Compute SHA-256 of a Buffer. Returns prefixed hex string. */
export function checksumBuffer(buffer: Buffer): string {
  return PREFIX + createHash(ALGORITHM).update(buffer).digest('hex');
}

/** Compute SHA-256 of a file by path. Returns prefixed hex string. */
export async function checksumFile(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return checksumBuffer(buffer);
}

/** Compute SHA-256 of a JSON-serializable object. Object is serialized with sorted keys. */
export function checksumObject(obj: unknown): string {
  const serialized = JSON.stringify(obj, sortedReplacer);
  return checksumString(serialized);
}

/** Validate a checksum string format. */
export function isValidChecksum(value: unknown): value is string {
  return typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value);
}

/** Return the placeholder checksum for documents not yet processed. */
export function emptyChecksum(): string {
  return EMPTY_CHECKSUM;
}

/** Strip the sha256: prefix and return the hex digest only. */
export function digestOnly(checksum: string): string {
  return checksum.startsWith(PREFIX) ? checksum.slice(PREFIX.length) : checksum;
}

function sortedReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.keys(value as object)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = (value as Record<string, unknown>)[k];
        return acc;
      }, {});
  }
  return value;
}
