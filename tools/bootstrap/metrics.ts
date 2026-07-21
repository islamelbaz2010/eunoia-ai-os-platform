import { generateToken } from "./utils.js";

const METRICS_TOKEN_KEY = "METRICS_TOKEN";

/**
 * Returns the existing METRICS_TOKEN value if present and non-trivial,
 * otherwise generates a cryptographically secure one.
 */
export function resolveMetricsToken(existing: string | undefined): {
  value: string;
  generated: boolean;
} {
  const trivial = new Set(["change-me-in-production", "", "YOUR_METRICS_TOKEN"]);
  if (existing && !trivial.has(existing)) {
    return { value: existing, generated: false };
  }
  return { value: generateToken(32), generated: true };
}

export { METRICS_TOKEN_KEY };
