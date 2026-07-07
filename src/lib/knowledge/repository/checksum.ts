import { createHash } from "crypto";

export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function makeEtag(hash: string, version: number): string {
  return `${hash}:${version}`;
}
