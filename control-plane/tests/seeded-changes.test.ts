import { describe, expect, it } from "vitest";
import {
  catalogProblems,
  computeSeededCase,
  loadSeededCatalog,
  parseSeededCatalog,
  unknownKeys,
} from "./seeded-catalog.ts";
import { PACK, loadYaml } from "@glt/contracts";

const catalog = loadSeededCatalog();

describe("DEV-11 seeded changes catalog", () => {
  it("INV-05 authorized set meets coverage and records the review limitation", () => {
    expect(catalogProblems(catalog)).toEqual([]);
    expect(catalog.cases).toHaveLength(13);
    expect(catalog.reviewStatus).toBe("limitation-recorded");
  });

  it("INV-05 a case without rationale is rejected by the catalog check", () => {
    const raw = loadYaml<Record<string, unknown>>(PACK.seededChanges);
    const cases = raw["cases"];
    if (!Array.isArray(cases) || !isRecord(cases[0])) {
      throw new Error("catalog cases missing");
    }
    const broken = {
      ...raw,
      cases: [{ ...cases[0], rationale: "" }, ...cases.slice(1)],
    };
    const problems = catalogProblems(parseSeededCatalog(broken));
    expect(problems.some((item) => item.includes("rationale missing"))).toBe(true);
  });

  it("INV-05 holdout ids are not used as ground truth", () => {
    const ids = catalog.cases.map((item) => item.id);
    expect(ids.some((id) => /^H0[1-5]$/.test(id))).toBe(false);
  });
});

describe("DEV-11 seeded changes versus hand-authored ground truth", () => {
  for (const item of catalog.cases) {
    it(`INV-05 ${item.id} matches authorized ground truth`, () => {
      const report = computeSeededCase(catalog, item);
      expect(report.affected_nodes).toEqual([...item.affected].sort());
      expect(report.required_checks).toEqual([...item.requiredChecks].sort());
      expect(unknownKeys(report)).toEqual(sortUnknowns(item.unknowns));
      expect(report.change.labels).toEqual([...item.labels].sort());
    });
  }
});

function sortUnknowns(items: readonly { kind: string; ref: string }[]) {
  return [...items].sort((left, right) => {
    if (left.kind < right.kind) return -1;
    if (left.kind > right.kind) return 1;
    if (left.ref < right.ref) return -1;
    if (left.ref > right.ref) return 1;
    return 0;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
