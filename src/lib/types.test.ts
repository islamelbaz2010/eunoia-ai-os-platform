import { describe, it, expect } from "vitest";
import { hasRole, ROLE_RANK, type OrgRole } from "./types";

describe("ROLE_RANK", () => {
  it("ranks roles in ascending order", () => {
    expect(ROLE_RANK.viewer).toBeLessThan(ROLE_RANK.member);
    expect(ROLE_RANK.member).toBeLessThan(ROLE_RANK.admin);
    expect(ROLE_RANK.admin).toBeLessThan(ROLE_RANK.owner);
  });
});

describe("hasRole", () => {
  const cases: [OrgRole, OrgRole, boolean][] = [
    ["owner", "owner", true],
    ["owner", "admin", true],
    ["owner", "member", true],
    ["owner", "viewer", true],
    ["admin", "owner", false],
    ["admin", "admin", true],
    ["admin", "member", true],
    ["admin", "viewer", true],
    ["member", "owner", false],
    ["member", "admin", false],
    ["member", "member", true],
    ["member", "viewer", true],
    ["viewer", "owner", false],
    ["viewer", "admin", false],
    ["viewer", "member", false],
    ["viewer", "viewer", true],
  ];

  it.each(cases)(
    "hasRole(%s, %s) === %s",
    (role, minimum, expected) => {
      expect(hasRole(role, minimum)).toBe(expected);
    }
  );
});
