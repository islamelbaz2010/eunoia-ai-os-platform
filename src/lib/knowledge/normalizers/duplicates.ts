import type { DuplicatePair } from "../types";
import { normalizeForComparison } from "./text";

function tokenize(text: string): string[] {
  return normalizeForComparison(text)
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function buildNGrams(words: string[], n: number): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i <= words.length - n; i++) {
    set.add(words.slice(i, i + n).join(" "));
  }
  return set;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  return intersection / (a.size + b.size - intersection);
}

/**
 * Returns a 0–1 similarity score between two text strings.
 * Uses a weighted average of bigram and trigram Jaccard similarity
 * after normalization.
 */
export function computeSimilarity(textA: string, textB: string): number {
  const wordsA = tokenize(textA);
  const wordsB = tokenize(textB);

  if (wordsA.join(" ") === wordsB.join(" ")) return 1;

  const bigramsA = buildNGrams(wordsA, 2);
  const bigramsB = buildNGrams(wordsB, 2);
  const bigramScore = jaccardSimilarity(bigramsA, bigramsB);

  const trigramsA = buildNGrams(wordsA, 3);
  const trigramsB = buildNGrams(wordsB, 3);
  const trigramScore = jaccardSimilarity(trigramsA, trigramsB);

  return bigramScore * 0.6 + trigramScore * 0.4;
}

/**
 * Scans an array of text strings and returns all duplicate pairs.
 * A pair is "exact" when the normalized texts match character-for-character.
 * A pair is "near" when Jaccard n-gram similarity exceeds the threshold.
 *
 * O(n²) — suitable for batch processing small-to-medium document sets.
 */
export function detectDuplicates(
  texts: string[],
  nearDuplicateThreshold = 0.8
): DuplicatePair[] {
  const normalized = texts.map(normalizeForComparison);
  const pairs: DuplicatePair[] = [];

  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      if (normalized[i] === normalized[j]) {
        pairs.push({ aIndex: i, bIndex: j, similarity: 1, type: "exact" });
        continue;
      }
      const similarity = computeSimilarity(texts[i]!, texts[j]!);
      if (similarity >= nearDuplicateThreshold) {
        pairs.push({ aIndex: i, bIndex: j, similarity, type: "near" });
      }
    }
  }

  return pairs;
}
