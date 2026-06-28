import { describe, it, expect } from "vitest";
import { slugify } from "./utils";

describe("slugify", () => {
  it("lowercases and hyphenates words", () => {
    const result = slugify("Grand Palace Hotel");
    // Remove the random suffix to test the prefix deterministically
    expect(result).toMatch(/^grand-palace-hotel-[a-z0-9]{5}$/);
  });

  it("strips leading and trailing hyphens from base", () => {
    const result = slugify("!!!Hello!!!");
    expect(result).toMatch(/^hello-[a-z0-9]{5}$/);
  });

  it("falls back to 'org' when input has no alphanumeric chars", () => {
    const result = slugify("!!!");
    expect(result).toMatch(/^org-[a-z0-9]{5}$/);
  });

  it("truncates base to 40 characters", () => {
    const long = "a".repeat(60);
    const result = slugify(long);
    // base is 40 chars + '-' + 5 char suffix = 46
    expect(result.length).toBeLessThanOrEqual(46);
  });

  it("appends a unique 5-character suffix", () => {
    const a = slugify("test");
    const b = slugify("test");
    // Suffix is random — they should differ with overwhelming probability
    expect(a).not.toBe(b);
  });

  it("produces output matching the create_organization slug regex", () => {
    // The DB function validates: ^[a-z0-9][a-z0-9-]*[a-z0-9]$
    const slugPattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    const cases = [
      "Hotel Cairo",
      "Diving Center",
      "Al Maha Resort",
      "123 Property",
    ];
    for (const name of cases) {
      expect(slugify(name)).toMatch(slugPattern);
    }
  });
});
