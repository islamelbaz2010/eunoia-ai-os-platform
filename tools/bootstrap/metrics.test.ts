import { describe, it, expect } from "vitest";
import { resolveMetricsToken, METRICS_TOKEN_KEY } from "./metrics.js";

describe("resolveMetricsToken", () => {
  it("generates a new token when existing is undefined", () => {
    const { value, generated } = resolveMetricsToken(undefined);
    expect(value).toBeTruthy();
    expect(generated).toBe(true);
  });

  it("generates a new token when existing is empty string", () => {
    const { generated } = resolveMetricsToken("");
    expect(generated).toBe(true);
  });

  it("generates a new token for trivial placeholder", () => {
    const { generated } = resolveMetricsToken("change-me-in-production");
    expect(generated).toBe(true);
  });

  it("keeps existing non-trivial token", () => {
    const existing = "a-real-secret-token-abcdef1234567890";
    const { value, generated } = resolveMetricsToken(existing);
    expect(value).toBe(existing);
    expect(generated).toBe(false);
  });

  it("generates unique tokens on each call", () => {
    const a = resolveMetricsToken(undefined).value;
    const b = resolveMetricsToken(undefined).value;
    expect(a).not.toBe(b);
  });

  it("exports correct constant", () => {
    expect(METRICS_TOKEN_KEY).toBe("METRICS_TOKEN");
  });
});
