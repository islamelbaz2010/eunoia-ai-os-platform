// ─── Global Knowledge Loader ──────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import type {
  GlobalDocument,
  GlobalManifest,
  GlobalLoadSummary,
  LoadResult,
} from './types';

const MANIFEST_RELATIVE = path.join('knowledge', 'global', 'manifest.json');

/**
 * Resolves the path to knowledge/global relative to a given root.
 * Defaults to process.cwd() when no root is provided.
 */
function globalRoot(repoRoot?: string): string {
  return path.join(repoRoot ?? process.cwd(), 'knowledge', 'global');
}

/** Loads and parses the global manifest. */
export function loadManifest(repoRoot?: string): GlobalManifest {
  const manifestPath = path.join(repoRoot ?? process.cwd(), MANIFEST_RELATIVE);
  const raw = fs.readFileSync(manifestPath, 'utf-8');
  return JSON.parse(raw) as GlobalManifest;
}

/** Loads a single global document by its path relative to knowledge/global/. */
export function loadGlobalDocument(relativePath: string, repoRoot?: string): GlobalDocument {
  const absPath = path.join(globalRoot(repoRoot), relativePath);
  const raw = fs.readFileSync(absPath, 'utf-8');
  const doc = JSON.parse(raw) as GlobalDocument;
  if (doc.industry !== 'global') {
    throw new Error(`Document at ${relativePath} has industry="${doc.industry as string}", expected "global"`);
  }
  return doc;
}

/**
 * Loads all global documents listed in the manifest.
 * Never throws — errors are captured in errorDetails.
 */
export function loadAllGlobalDocuments(repoRoot?: string): GlobalLoadSummary {
  const manifest = loadManifest(repoRoot);
  const documents: LoadResult[] = [];
  const errorDetails: Array<{ path: string; error: string }> = [];

  for (const entry of manifest.documents) {
    try {
      const document = loadGlobalDocument(entry.path, repoRoot);
      documents.push({ path: entry.path, document, category: entry.category });
    } catch (err) {
      errorDetails.push({
        path: entry.path,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    loaded: documents.length,
    errors: errorDetails.length,
    documents,
    errorDetails,
  };
}

/**
 * Returns a specific global document by its id (UUID).
 * Returns null if not found.
 */
export function findGlobalDocumentById(id: string, repoRoot?: string): GlobalDocument | null {
  const { documents } = loadAllGlobalDocuments(repoRoot);
  return documents.find(r => r.document.id === id)?.document ?? null;
}

/**
 * Returns all global documents matching a category.
 */
export function getGlobalDocumentsByCategory(category: string, repoRoot?: string): readonly GlobalDocument[] {
  const { documents } = loadAllGlobalDocuments(repoRoot);
  return documents.filter(r => r.category === category).map(r => r.document);
}
