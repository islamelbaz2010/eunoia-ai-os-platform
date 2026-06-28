import { describe, it, expect } from "vitest";
import { chunkText } from "./chunk";

describe("chunkText", () => {
  it("returns empty array for empty string", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   ")).toEqual([]);
  });

  it("returns a single chunk for short text", () => {
    const chunks = chunkText("Hello world");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe("Hello world");
  });

  it("normalizes CRLF to LF", () => {
    const chunks = chunkText("Line one\r\nLine two");
    expect(chunks[0]).toBe("Line one\nLine two");
  });

  it("produces multiple chunks for long text with correct overlap", () => {
    // 1150 chars → first chunk: 0-1000, second chunk: 850-1150 (overlap 150)
    const text = "a".repeat(1150);
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(1000);
    expect(chunks[1]).toHaveLength(300); // 1150 - 850
  });

  it("does not produce empty chunks", () => {
    const text = "x".repeat(3000);
    const chunks = chunkText(text);
    expect(chunks.every((c) => c.length > 0)).toBe(true);
  });

  it("trims whitespace from individual chunks", () => {
    const text = "  leading and trailing  ";
    const chunks = chunkText(text);
    expect(chunks[0]).toBe("leading and trailing");
  });
});
