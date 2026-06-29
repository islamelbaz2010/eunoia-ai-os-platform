import "server-only";

import type { HealthReport } from "./types";

/**
 * Extension point for health-state transition alerting.
 *
 * Implement this interface to connect state changes to external systems.
 * Suggested locations: src/lib/health/alerts/<channel>.ts
 *
 *   slack.ts     — POST to Slack incoming webhook
 *   discord.ts   — POST to Discord webhook URL
 *   telegram.ts  — Telegram Bot API sendMessage
 *   email.ts     — Resend transactional email (reuse src/lib/email.ts)
 *   pagerduty.ts — PagerDuty Events API v2 (trigger / resolve)
 *   opsgenie.ts  — OpsGenie Alerts API
 *
 * Dispatch pattern:
 *   Compare the current HealthReport against getHistory() to detect transitions.
 *   A future dispatchAlerts(report, alertProviders) helper belongs in
 *   src/lib/health/alert-dispatcher.ts — call it from the route handlers after
 *   runHealthCheck(), passing ALERT_PROVIDERS alongside HEALTH_PROVIDERS.
 *
 * State-transition model (not level-based):
 *   onDegraded fires ONCE on the healthy→degraded edge.
 *   onRecovered fires ONCE on the degraded→healthy edge.
 *   This prevents alert storms on every polling interval while degraded.
 *   Implementations must be idempotent in case of retries.
 *
 * @example
 *   import type { AlertProvider } from "@/lib/health/alert-provider";
 *   export const slackAlerts: AlertProvider = {
 *     name: "slack-ops",
 *     get enabled() { return process.env.SLACK_WEBHOOK_URL !== undefined; },
 *     async onDegraded(report) { ... },
 *     async onRecovered(report) { ... },
 *   };
 */
export interface AlertProvider {
  /** Human-readable channel name used in logs (e.g. "slack-ops-alerts"). */
  readonly name: string;

  /**
   * Whether this channel is active.
   * Read from env vars so channels can be toggled without a redeploy:
   *   `process.env.ENABLE_SLACK_ALERTS !== "false"`
   */
  readonly enabled: boolean;

  /**
   * Called on healthy → degraded transition.
   * Must never throw — catch all I/O errors internally and log them.
   */
  onDegraded(report: HealthReport): Promise<void>;

  /**
   * Called on degraded → healthy transition (incident resolved).
   * Implementations should close/resolve the open incident on the external system.
   * Must never throw — catch all I/O errors internally and log them.
   */
  onRecovered(report: HealthReport): Promise<void>;
}
