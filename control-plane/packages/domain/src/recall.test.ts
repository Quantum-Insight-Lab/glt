import { describe, expect, it } from "vitest";
import { aggregateScores, recallIsComplete, recallPrecision } from "./recall.ts";

describe("DEV-12 recall against ground truth", () => {
  it("INV-05 a missed required check drops recall below completeness", () => {
    const complete = recallPrecision(["check-a", "check-b"], ["check-a", "check-b"]);
    const missed = recallPrecision(["check-a"], ["check-a", "check-b"]);
    expect(recallIsComplete(complete)).toBe(true);
    expect(recallIsComplete(missed)).toBe(false);
    expect(missed.recall).toBeLessThan(complete.recall);
  });

  it("INV-05 extra predicted ids lower precision and leave recall complete", () => {
    const extra = recallPrecision(["a", "b", "noise"], ["a", "b"]);
    expect(recallIsComplete(extra)).toBe(true);
    expect(extra.precision).toBeLessThan(1);
  });

  it("empty truth is vacuously complete", () => {
    const score = recallPrecision(["noise"], []);
    expect(recallIsComplete(score)).toBe(true);
    expect(score.recall).toBe(1);
  });

  it("aggregate recall is complete only when every truth id is hit", () => {
    const parts = [
      recallPrecision(["n1"], ["n1"]),
      recallPrecision(["n2"], ["n2", "n3"]),
    ];
    const all = aggregateScores(parts);
    expect(recallIsComplete(parts[0]!)).toBe(true);
    expect(recallIsComplete(all)).toBe(false);
  });
});
