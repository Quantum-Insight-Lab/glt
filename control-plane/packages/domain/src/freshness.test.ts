import { describe, expect, it } from "vitest";
import { snapshotIsStale } from "./freshness.ts";

describe("DEV-12 snapshot freshness P01", () => {
  it("E03 H04 an age inside the limit is not stale", () => {
    expect(snapshotIsStale(3600, 3600)).toBe(false);
    expect(snapshotIsStale(0, 3600)).toBe(false);
  });

  it("E03 H04 an age older than P01 is stale and is not treated as healthy", () => {
    expect(snapshotIsStale(3601, 3600)).toBe(true);
  });
});
