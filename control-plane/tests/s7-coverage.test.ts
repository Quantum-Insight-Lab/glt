import { describe, expect, it } from "vitest";
import { structuralCoverage } from "@glt/cli";
import { PACK, readText } from "@glt/contracts";
import { join } from "node:path";
import {
  parseDeferrals,
  parseRegistryIds,
  reconcileCoverage,
} from "@glt/domain";

describe("S-7 every invariant id has a named test or a visible deferral", () => {
  const proto = readText(join(PACK.docs, "SPEC", "invariants.md"));
  const inv = readText(join(PACK.docs, "PDA", "04-invariants.md"));
  const structural = readText(join(PACK.docs, "SPEC", "structural-invariants.md"));
  const registry = parseRegistryIds(proto, inv, structural);
  const deferrals = parseDeferrals(structural);
  const report = structuralCoverage();

  it("S-7 finds 18 PROTO, 12 INV and 10 S in the three registries", () => {
    expect(registry.filter((id) => id.startsWith("PROTO-"))).toHaveLength(18);
    expect(registry.filter((id) => id.startsWith("INV-"))).toHaveLength(12);
    expect(registry.filter((id) => id.startsWith("S-"))).toHaveLength(10);
    expect(registry).toHaveLength(40);
  });

  it("S-7 an invariant without a test is reported, not dropped", () => {
    expect(report.uncovered.length).toBeGreaterThan(0);
    expect(report.uncovered).toContain("PROTO-11");
    expect(report.total).toBe(registry.length);
  });

  it("S-7 a deferred invariant is marked with a DEV step and counts as uncovered", () => {
    const proto11 = deferrals.find((d) => d.id === "PROTO-11");
    expect(proto11?.until).toBe("glt.dev.16");
    expect(report.uncovered).toContain("PROTO-11");
    expect(report.deferred.map((d) => d.id)).toContain("PROTO-11");
    expect(report.covered).toBeLessThan(report.total);
  });

  it("S-7 glt_structural_coverage is a number", () => {
    expect(report.metric).toBe("glt_structural_coverage");
    expect(typeof report.value).toBe("number");
    expect(Number.isFinite(report.value)).toBe(true);
    expect(report.value).toBe(report.covered / report.total);
  });

  it("S-7 removing INV-10 from test names fails the gate", () => {
    const testIds = registry.filter((id) => !report.uncovered.includes(id));
    expect(testIds).toContain("INV-10");
    const stripped = reconcileCoverage({
      registry,
      testIds: testIds.filter((id) => id !== "INV-10"),
      deferrals,
    });
    expect(stripped.missingTests).toContain("INV-10");
  });

  it("S-7 no undeferred invariant is missing a test", () => {
    expect(report.missingTests).toEqual([]);
    expect(report.unknownDeferrals).toEqual([]);
  });
});
