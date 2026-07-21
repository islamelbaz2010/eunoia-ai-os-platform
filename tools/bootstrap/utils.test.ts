import { describe, it, expect } from "vitest";
import { sha256, generateToken, isEnvVarName, parseKeyValueLine, pluralize } from "./utils.js";

describe("sha256", () => {
  it("returns consistent hex string for same input", () => {
    expect(sha256("hello")).toBe(sha256("hello"));
  });

  it("returns different hashes for different inputs", () => {
    expect(sha256("a")).not.toBe(sha256("b"));
  });

  it("returns 64-char hex string", () => {
    expect(sha256("test")).toHaveLength(64);
    expect(sha256("test")).toMatch(/^[0-9a-f]+$/);
  });
});

describe("generateToken", () => {
  it("returns a non-empty string", () => {
    expect(generateToken()).toBeTruthy();
  });

  it("returns unique tokens", () => {
    expect(generateToken()).not.toBe(generateToken());
  });

  it("uses specified byte length", () => {
    // 32 bytes base64 = ~44 chars
    expect(generateToken(32).length).toBeGreaterThan(20);
  });
});

describe("isEnvVarName", () => {
  it("accepts valid env var names", () => {
    expect(isEnvVarName("OPENAI_API_KEY")).toBe(true);
    expect(isEnvVarName("NEXT_PUBLIC_SUPABASE_URL")).toBe(true);
    expect(isEnvVarName("AB")).toBe(true);
  });

  it("rejects invalid names", () => {
    expect(isEnvVarName("lowercase")).toBe(false);
    expect(isEnvVarName("A")).toBe(false); // single char fails {1,}
    expect(isEnvVarName("")).toBe(false);
    expect(isEnvVarName("1STARTS_WITH_NUMBER")).toBe(false);
    expect(isEnvVarName("HAS SPACE")).toBe(false);
  });
});

describe("parseKeyValueLine", () => {
  it("parses KEY=value correctly", () => {
    const result = parseKeyValueLine("OPENAI_API_KEY=sk-abc");
    expect(result).toEqual({ key: "OPENAI_API_KEY", value: "sk-abc" });
  });

  it("handles value with = signs", () => {
    const result = parseKeyValueLine("TOKEN=abc=def=ghi");
    expect(result?.value).toBe("abc=def=ghi");
  });

  it("returns null for no = sign", () => {
    expect(parseKeyValueLine("NO_EQUALS")).toBeNull();
  });

  it("returns null for lowercase key", () => {
    expect(parseKeyValueLine("lowercase=value")).toBeNull();
  });

  it("trims whitespace", () => {
    const result = parseKeyValueLine("  SOME_KEY = some value  ");
    expect(result).toEqual({ key: "SOME_KEY", value: "some value" });
  });
});

describe("pluralize", () => {
  it("uses singular for 1", () => {
    expect(pluralize(1, "var")).toBe("1 var");
  });

  it("uses plural for 0 and 2+", () => {
    expect(pluralize(0, "var")).toBe("0 vars");
    expect(pluralize(5, "var")).toBe("5 vars");
  });

  it("uses custom plural", () => {
    expect(pluralize(2, "entry", "entries")).toBe("2 entries");
  });
});
