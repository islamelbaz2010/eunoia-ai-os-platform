import "server-only";

/**
 * Reads a boolean feature flag from environment variables.
 *
 * Convention: set FLAG=false or FLAG=0 to disable a provider.
 * Absent or any other value → enabled (conservative default so existing
 * deployments without the new flag set keep working unchanged).
 */
export function isEnabled(flag: string): boolean {
  const val = process.env[flag];
  if (val === undefined || val === "") return true;
  return val !== "false" && val !== "0";
}
