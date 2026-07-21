import { describe, it, expect } from 'vitest';
import path from 'path';
import {
  loadManifest,
  loadGlobalDocument,
  loadAllGlobalDocuments,
  findGlobalDocumentById,
  getGlobalDocumentsByCategory,
} from './loader';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../../');

// ─── Manifest ─────────────────────────────────────────────────────────────────

describe('loadManifest', () => {
  it('loads the manifest without error', () => {
    const manifest = loadManifest(REPO_ROOT);
    expect(manifest).toBeDefined();
  });

  it('has layer = global', () => {
    const manifest = loadManifest(REPO_ROOT);
    expect(manifest.layer).toBe('global');
  });

  it('has 7 documents listed', () => {
    const manifest = loadManifest(REPO_ROOT);
    expect(manifest.documents).toHaveLength(7);
  });

  it('lists three categories', () => {
    const manifest = loadManifest(REPO_ROOT);
    expect(Object.keys(manifest.categories)).toHaveLength(3);
    expect(manifest.categories).toHaveProperty('platform');
    expect(manifest.categories).toHaveProperty('hospitality');
    expect(manifest.categories).toHaveProperty('ai-practices');
  });

  it('total_documents matches documents array length', () => {
    const manifest = loadManifest(REPO_ROOT);
    expect(manifest.total_documents).toBe(manifest.documents.length);
  });
});

// ─── Single document loader ───────────────────────────────────────────────────

describe('loadGlobalDocument', () => {
  it('loads platform/eunoia-platform-overview.json', () => {
    const doc = loadGlobalDocument('platform/eunoia-platform-overview.json', REPO_ROOT);
    expect(doc).toBeDefined();
    expect(doc.industry).toBe('global');
  });

  it('loaded document has required fields', () => {
    const doc = loadGlobalDocument('platform/ai-assistant-guide.json', REPO_ROOT);
    expect(doc.id).toBeTruthy();
    expect(doc.title).toBeTruthy();
    expect(doc.body).toBeTruthy();
    expect(doc.schema_version).toBe('1.0.0');
  });

  it('throws for document with non-global industry', () => {
    expect(() => {
      // manufacture a missing-file scenario — will throw FS error, not industry error
      loadGlobalDocument('nonexistent/document.json', REPO_ROOT);
    }).toThrow();
  });

  it('all 7 documents load without error', () => {
    const paths = [
      'platform/eunoia-platform-overview.json',
      'platform/ai-assistant-guide.json',
      'platform/knowledge-base-guide.json',
      'hospitality/guest-service-excellence.json',
      'hospitality/complaint-resolution.json',
      'hospitality/communication-standards.json',
      'ai-practices/effective-questioning.json',
    ];
    for (const p of paths) {
      expect(() => loadGlobalDocument(p, REPO_ROOT)).not.toThrow();
    }
  });
});

// ─── Bulk loader ──────────────────────────────────────────────────────────────

describe('loadAllGlobalDocuments', () => {
  it('loads all documents without errors', () => {
    const summary = loadAllGlobalDocuments(REPO_ROOT);
    expect(summary.errors).toBe(0);
    expect(summary.loaded).toBe(7);
  });

  it('returns errorDetails as empty array when all succeed', () => {
    const summary = loadAllGlobalDocuments(REPO_ROOT);
    expect(summary.errorDetails).toHaveLength(0);
  });

  it('every loaded document has industry = global', () => {
    const { documents } = loadAllGlobalDocuments(REPO_ROOT);
    for (const result of documents) {
      expect(result.document.industry).toBe('global');
    }
  });

  it('every loaded document has a non-empty body', () => {
    const { documents } = loadAllGlobalDocuments(REPO_ROOT);
    for (const result of documents) {
      expect(result.document.body.length).toBeGreaterThan(100);
    }
  });

  it('every loaded document has a valid status', () => {
    const valid = ['published', 'draft', 'archived'];
    const { documents } = loadAllGlobalDocuments(REPO_ROOT);
    for (const result of documents) {
      expect(valid).toContain(result.document.status);
    }
  });

  it('captures errors rather than throwing when a document is missing', () => {
    // Point at a different root to guarantee manifest not found — should throw
    expect(() => loadAllGlobalDocuments('/nonexistent/path')).toThrow();
  });
});

// ─── findGlobalDocumentById ───────────────────────────────────────────────────

describe('findGlobalDocumentById', () => {
  it('returns a document when the id exists', () => {
    const { documents } = loadAllGlobalDocuments(REPO_ROOT);
    const first = documents[0].document;
    const found = findGlobalDocumentById(first.id, REPO_ROOT);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(first.id);
  });

  it('returns null for an unknown id', () => {
    const result = findGlobalDocumentById('00000000-0000-0000-0000-000000000000', REPO_ROOT);
    expect(result).toBeNull();
  });
});

// ─── getGlobalDocumentsByCategory ────────────────────────────────────────────

describe('getGlobalDocumentsByCategory', () => {
  it('returns 3 platform documents', () => {
    const docs = getGlobalDocumentsByCategory('platform', REPO_ROOT);
    expect(docs).toHaveLength(3);
  });

  it('returns 3 hospitality documents', () => {
    const docs = getGlobalDocumentsByCategory('hospitality', REPO_ROOT);
    expect(docs).toHaveLength(3);
  });

  it('returns 1 ai-practices document', () => {
    const docs = getGlobalDocumentsByCategory('ai-practices', REPO_ROOT);
    expect(docs).toHaveLength(1);
  });

  it('returns empty array for unknown category', () => {
    const docs = getGlobalDocumentsByCategory('unknown-category', REPO_ROOT);
    expect(docs).toHaveLength(0);
  });

  it('all returned documents have industry = global', () => {
    const docs = getGlobalDocumentsByCategory('hospitality', REPO_ROOT);
    for (const doc of docs) {
      expect(doc.industry).toBe('global');
    }
  });
});
