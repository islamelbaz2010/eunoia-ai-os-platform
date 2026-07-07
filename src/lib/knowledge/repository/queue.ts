// Queue architecture — type definitions only.
// Background workers are out of scope for KB-2.
// Callers enqueue jobs by constructing KnowledgeJob values and managing them
// externally (e.g. in a database-backed queue, BullMQ, Vercel Queues, etc.).

export type {
  KnowledgeJob,
  KnowledgeQueue,
  KnowledgeJobType,
  KnowledgeJobStatus,
} from "./types";

export function makeJob(
  partial: Omit<import("./types").KnowledgeJob, "id" | "createdAt" | "startedAt" | "completedAt" | "error">
): import("./types").KnowledgeJob {
  return {
    ...partial,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    error: null,
  };
}

export function summariseQueue(
  jobs: readonly import("./types").KnowledgeJob[]
): import("./types").KnowledgeQueue {
  return {
    jobs,
    pending: jobs.filter((j) => j.status === "queued").length,
    running: jobs.filter((j) => j.status === "running").length,
    completed: jobs.filter((j) => j.status === "completed").length,
    failed: jobs.filter((j) => j.status === "failed").length,
  };
}
