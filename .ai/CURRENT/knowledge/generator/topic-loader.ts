/**
 * Topic Loader — loads and queries the topics.json registry.
 * Topics define what documents the generator produces for each industry × department.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Topic, TopicsMap, IndustryId, DepartmentId } from './types.js';

let loaded: TopicsMap | null = null;

async function ensureLoaded(): Promise<TopicsMap> {
  if (loaded) return loaded;
  const raw = await readFile(path.resolve(__dirname, 'topics.json'), 'utf8');
  loaded = JSON.parse(raw) as TopicsMap;
  return loaded;
}

/**
 * Return all topics for a given industry + department combination.
 * Returns an empty array if the combination has no topics defined.
 */
export async function loadTopics(
  industryId: IndustryId,
  departmentId: DepartmentId
): Promise<Topic[]> {
  const map = await ensureLoaded();
  return map.industries[industryId]?.departments[departmentId]?.topics ?? [];
}

/**
 * Return a specific topic by its id within an industry + department.
 * Throws if not found.
 */
export async function loadTopic(
  industryId: IndustryId,
  departmentId: DepartmentId,
  topicId: string
): Promise<Topic> {
  const topics = await loadTopics(industryId, departmentId);
  const topic = topics.find((t) => t.id === topicId);
  if (!topic) {
    throw new Error(`Topic not found: ${industryId}/${departmentId}/${topicId}`);
  }
  return topic;
}

/**
 * Return all topics across an entire industry (all departments).
 * Returns a flat array annotated with departmentId.
 */
export async function loadIndustryTopics(
  industryId: IndustryId
): Promise<Array<Topic & { departmentId: DepartmentId }>> {
  const map = await ensureLoaded();
  const industryMap = map.industries[industryId];
  if (!industryMap) return [];

  return Object.entries(industryMap.departments).flatMap(([deptId, { topics }]) =>
    topics.map((t) => ({ ...t, departmentId: deptId as DepartmentId }))
  );
}

/**
 * Return all topics across all industries and departments.
 * Each entry is annotated with industryId and departmentId.
 */
export async function loadAllTopics(): Promise<
  Array<Topic & { industryId: IndustryId; departmentId: DepartmentId }>
> {
  const map = await ensureLoaded();
  const results: Array<Topic & { industryId: IndustryId; departmentId: DepartmentId }> = [];

  for (const [indId, indMap] of Object.entries(map.industries)) {
    for (const [deptId, { topics }] of Object.entries(indMap.departments)) {
      for (const topic of topics) {
        results.push({
          ...topic,
          industryId: indId as IndustryId,
          departmentId: deptId as DepartmentId,
        });
      }
    }
  }

  return results;
}

/** Return the total topic count across the entire registry. */
export async function countTopics(): Promise<number> {
  const map = await ensureLoaded();
  return map.totalTopics;
}

/** Return whether a topic id exists within a given industry + department. */
export async function isValidTopic(
  industryId: IndustryId,
  departmentId: DepartmentId,
  topicId: string
): Promise<boolean> {
  const topics = await loadTopics(industryId, departmentId);
  return topics.some((t) => t.id === topicId);
}

/** Clear in-memory cache (used in tests). */
export function clearCache(): void {
  loaded = null;
}
