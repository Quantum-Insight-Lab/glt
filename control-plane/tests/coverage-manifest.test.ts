import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PACK, loadDocument } from "@glt/contracts";
import {
  completeImpactAllowed,
  coverageManifestFromDoc,
  reconcileCoverageManifest,
  rejectCompleteImpact,
} from "@glt/domain";
import { computeImpactFromPaths } from "@glt/impact";
import { compileRegistryFromPaths, loadCoverageManifest } from "@glt/registry";
import { run } from "@glt/cli";

const GOLDEN_SNAPSHOT = join(PACK.examples, "golden", "bootstrap-snapshot.json");

describe("DEV-19 coverage manifest on the committed pack", () => {
  it("INV-05 bootstrap manifest nodes and edges match compileRegistry", () => {
    const compiled = compileRegistryFromPaths();
    const fromFile = coverageManifestFromDoc(
      loadDocument(join(PACK.boundaries, "bootstrap-slice.yaml")),
    );
    const loaded = loadCoverageManifest(compiled.boundary);
    expect(loaded.id).toBe(fromFile.id);
    expect(loaded.nodes).toEqual(fromFile.nodes);
    reconcileCoverageManifest(
      { nodes: fromFile.nodes, edges: fromFile.edges },
      {
        nodes: compiled.entries.map((entry) => entry.id),
        edges: compiled.edges.map((edge) => edge.id),
      },
    );
    expect(compiled.entries.map((entry) => entry.id).sort()).toEqual([...fromFile.nodes].sort());
    expect(compiled.edges.map((edge) => edge.id).sort()).toEqual([...fromFile.edges].sort());
  });

  it("INV-05 golden impact stays inside the manifest and is complete-allowed", () => {
    const report = computeImpactFromPaths({ snapshot: GOLDEN_SNAPSHOT });
    expect(report.coverage_not_established).toBe(false);
    expect(report.known_unknowns).toEqual([]);
    expect(completeImpactAllowed(report)).toBe(true);
    rejectCompleteImpact(report);
  });

  it("glt impact --snapshot golden reports coverage from the manifest", async () => {
    const result = await run([
      "impact",
      "--snapshot",
      "glt-specpack/contracts/examples/golden/bootstrap-snapshot.json",
      "-o",
      "json",
    ]);
    expect(result.code).toBe(0);
    const body = JSON.parse(result.stdout) as {
      coverage_not_established: boolean;
      known_unknowns: { kind: string; ref?: string }[];
    };
    expect(body.coverage_not_established).toBe(false);
    expect(body.known_unknowns).toEqual([]);
    expect(completeImpactAllowed(body)).toBe(true);
  });
});
