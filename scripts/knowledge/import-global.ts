#!/usr/bin/env tsx
/**
 * scripts/knowledge/import-global.ts
 * Import global knowledge documents into Supabase.
 *
 * Reads all documents from knowledge/global/ (via the manifest), chunks each
 * document's body, generates OpenAI embeddings, and upserts rows into:
 *   - public.global_knowledge_documents
 *   - public.global_knowledge_chunks
 *
 * Idempotent: existing documents (matched by source_path) are updated in-place.
 * Existing chunks for a document are deleted and re-inserted on each run.
 *
 * Usage:
 *   npx tsx scripts/knowledge/import-global.ts
 *   npx tsx scripts/knowledge/import-global.ts --dry-run
 *   npx tsx scripts/knowledge/import-global.ts --category platform
 *   npx tsx scripts/knowledge/import-global.ts --category hospitality
 *   npx tsx scripts/knowledge/import-global.ts --category ai-practices
 *
 * Requirements:
 *   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.
 *   OPENAI_API_KEY must be set (for embeddings).
 *   .env.local is loaded automatically if present.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { loadAllGlobalDocuments } from '../../src/lib/knowledge/global/loader';
import type { GlobalDocument } from '../../src/lib/knowledge/global/types';

const ROOT = resolve(import.meta.dirname, '../..');

// ─── Env loading ──────────────────────────────────────────────────────────────

function loadEnv(): void {
  const envFile = resolve(ROOT, '.env.local');
  if (!existsSync(envFile)) return;
  const lines = readFileSync(envFile, 'utf-8').split('\n');
  for (const raw of lines) {
    const line = raw.split('#')[0].trim();
    if (!line.includes('=')) continue;
    const eq = line.indexOf('=');
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    val = val.replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
}

loadEnv();

// ─── Config ───────────────────────────────────────────────────────────────────

const DRY_RUN       = process.argv.includes('--dry-run');
const CATEGORY_FILTER = (() => {
  const idx = process.argv.indexOf('--category');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const SB_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_SROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OAI_KEY  = process.env.OPENAI_API_KEY;

// ─── Chunk size ───────────────────────────────────────────────────────────────

const CHUNK_SIZE_WORDS = 400;
const CHUNK_OVERLAP_WORDS = 80;

// ─── Logging ──────────────────────────────────────────────────────────────────

const C = {
  B: '\x1b[1m', N: '\x1b[0m',
  G: '\x1b[32m', R: '\x1b[31m', Y: '\x1b[33m', C: '\x1b[36m',
};

function ok(msg: string)   { console.log(`  ${C.G}✓${C.N} ${msg}`); }
function warn(msg: string) { console.log(`  ${C.Y}⚠${C.N} ${msg}`); }
function err(msg: string)  { console.log(`  ${C.R}✗${C.N} ${msg}`); }
function hdr(msg: string)  { console.log(`\n${C.B}── ${msg}${C.N}`); }

// ─── Chunking ─────────────────────────────────────────────────────────────────

function chunkText(text: string): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + CHUNK_SIZE_WORDS, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end === words.length) break;
    start += CHUNK_SIZE_WORDS - CHUNK_OVERLAP_WORDS;
  }
  return chunks.filter(c => c.trim().length > 0);
}

// ─── Embedding ────────────────────────────────────────────────────────────────

async function embedText(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8191),
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI embeddings failed (${response.status}): ${body}`);
  }
  const data = await response.json() as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding;
}

// ─── Import one document ──────────────────────────────────────────────────────

async function importDocument(
  supabase: SupabaseClient,
  doc: GlobalDocument,
  category: string,
  relativePath: string,
  stats: { inserted: number; updated: number; chunks: number; errors: string[] },
): Promise<void> {
  const sourcePath = `knowledge/global/${relativePath}`;

  if (DRY_RUN) {
    const chunks = chunkText(doc.body);
    ok(`[DRY-RUN] Would import "${doc.title}" (${chunks.length} chunks)`);
    stats.inserted++;
    stats.chunks += chunks.length;
    return;
  }

  // Upsert the document record
  const { data: docRow, error: docErr } = await supabase
    .from('global_knowledge_documents')
    .upsert(
      {
        title: doc.title,
        content: doc.body,
        source_path: sourcePath,
        language: doc.language,
        category,
      },
      { onConflict: 'source_path', ignoreDuplicates: false }
    )
    .select('id')
    .single();

  if (docErr || !docRow) {
    const message = `"${doc.title}": ${docErr?.message ?? 'no row returned'}`;
    err(message);
    stats.errors.push(message);
    return;
  }

  const documentId: string = docRow.id as string;

  // Delete existing chunks for this document (full replacement)
  const { error: deleteErr } = await supabase
    .from('global_knowledge_chunks')
    .delete()
    .eq('document_id', documentId);

  if (deleteErr) {
    warn(`Could not delete existing chunks for "${doc.title}": ${deleteErr.message}`);
  }

  // Chunk and embed
  const chunks = chunkText(doc.body);
  let chunkCount = 0;

  for (const chunk of chunks) {
    const embedding = await embedText(chunk);
    const { error: chunkErr } = await supabase
      .from('global_knowledge_chunks')
      .insert({ document_id: documentId, content: chunk, embedding });

    if (chunkErr) {
      warn(`Chunk insert failed for "${doc.title}": ${chunkErr.message}`);
    } else {
      chunkCount++;
    }
  }

  ok(`"${doc.title}" — ${chunkCount}/${chunks.length} chunks`);
  stats.chunks += chunkCount;

  if (docRow) {
    stats.updated++;
  } else {
    stats.inserted++;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n${C.B}${C.C}╔══════════════════════════════════════════════════╗${C.N}`);
  console.log(`${C.B}${C.C}║  Eunoia AI OS — Global Knowledge Importer        ║${C.N}`);
  console.log(`${C.B}${C.C}╚══════════════════════════════════════════════════╝${C.N}`);
  if (DRY_RUN) console.log(`\n${C.Y}⚠  DRY RUN — no data will be written to Supabase${C.N}\n`);

  // ── Validate env ─────────────────────────────────────────────────────────
  if (!SB_URL) { err('NEXT_PUBLIC_SUPABASE_URL is not set'); process.exit(1); }
  if (!SB_SROLE) { err('SUPABASE_SERVICE_ROLE_KEY is not set'); process.exit(1); }
  if (!OAI_KEY && !DRY_RUN) { err('OPENAI_API_KEY is not set — required for embeddings'); process.exit(1); }

  const supabase = createClient(SB_URL, SB_SROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Load manifest and documents ───────────────────────────────────────────
  hdr('Loading global knowledge documents');

  const summary = loadAllGlobalDocuments(ROOT);
  if (summary.errors > 0) {
    for (const e of summary.errorDetails) {
      err(`Failed to load ${e.path}: ${e.error}`);
    }
    if (summary.loaded === 0) {
      err('No documents loaded — aborting');
      process.exit(1);
    }
    warn(`${summary.errors} document(s) failed to load and will be skipped`);
  }

  const toImport = CATEGORY_FILTER
    ? summary.documents.filter(r => r.category === CATEGORY_FILTER)
    : summary.documents;

  if (toImport.length === 0) {
    warn(CATEGORY_FILTER
      ? `No documents found for category "${CATEGORY_FILTER}"`
      : 'No documents to import');
    process.exit(0);
  }

  ok(`Loaded ${summary.loaded} documents${CATEGORY_FILTER ? ` (filtered to "${CATEGORY_FILTER}": ${toImport.length})` : ''}`);

  // ── Import documents ──────────────────────────────────────────────────────
  hdr(`Importing ${toImport.length} document(s)`);

  const stats = { inserted: 0, updated: 0, chunks: 0, errors: [] as string[] };

  for (const result of toImport) {
    await importDocument(supabase, result.document, result.category, result.path, stats);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  hdr('Import complete');
  ok(`Documents: ${stats.inserted + stats.updated} (${stats.inserted} inserted, ${stats.updated} updated)`);
  ok(`Chunks embedded: ${stats.chunks}`);

  if (stats.errors.length > 0) {
    err(`${stats.errors.length} error(s):`);
    for (const e of stats.errors) {
      err(`  ${e}`);
    }
    process.exit(1);
  }

  console.log('');
}

main().catch((e: unknown) => {
  console.error('Fatal:', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
