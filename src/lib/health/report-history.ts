import "server-only";

import type { CheckStatus, HealthReport } from "./types";

// Compact per-check summary stored in the ring buffer.
// Full metadata is intentionally omitted — provider statuses + latency are
// sufficient for trend analysis without unbounded memory growth.
export interface HistoryEntry {
  healthy: boolean;
  checked_at: string;
  providers: Record<string, { status: CheckStatus; latency_ms: number }>;
}

// True O(1)-push ring buffer. At capacity=100 and ~8 providers per entry,
// peak memory is well under 1 MB regardless of polling frequency.
class RingBuffer<T> {
  private readonly buf: (T | undefined)[];
  private head = 0; // next write position (wraps at capacity)
  private count = 0;

  constructor(private readonly capacity: number) {
    this.buf = new Array(capacity);
  }

  push(item: T): void {
    this.buf[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  /** Returns all entries oldest-first. O(n) — only call from diagnostics routes. */
  toArray(): T[] {
    if (this.count === 0) return [];
    if (this.count < this.capacity) {
      return this.buf.slice(0, this.count) as T[];
    }
    // Buffer full: head points to oldest slot.
    return [
      ...(this.buf.slice(this.head) as T[]),
      ...(this.buf.slice(0, this.head) as T[]),
    ];
  }

  get length(): number {
    return this.count;
  }
}

const CAPACITY = 100;
const historyBuffer = new RingBuffer<HistoryEntry>(CAPACITY);

// Unbounded counters — reset on process restart, never capped at ring buffer size.
// Exposed by /api/metrics for Prometheus scraping.
let totalChecks = 0;
let healthyChecks = 0;

function toHistoryEntry(report: HealthReport): HistoryEntry {
  const providers: Record<string, { status: CheckStatus; latency_ms: number }> = {};
  for (const [name, result] of Object.entries(report.providers)) {
    providers[name] = { status: result.status, latency_ms: result.latency_ms };
  }
  return { healthy: report.healthy, checked_at: report.checked_at, providers };
}

/**
 * Records the result of a health check run into the ring buffer.
 * Called by route handlers after each actual check execution.
 * Cache hits (/api/health HIT responses) do NOT call this — only real check
 * runs are recorded, so history reflects check executions, not response count.
 */
export function recordReport(report: HealthReport): void {
  historyBuffer.push(toHistoryEntry(report));
  totalChecks++;
  if (report.healthy) healthyChecks++;
}

/** Returns lifetime check counts since last process start. Resets on restart. */
export function getCheckStats(): { total: number; healthy: number } {
  return { total: totalChecks, healthy: healthyChecks };
}

/**
 * Returns the last ≤100 health check results, oldest-first.
 * In-memory only — resets on process restart. No persistence.
 */
export function getHistory(): HistoryEntry[] {
  return historyBuffer.toArray();
}
