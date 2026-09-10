import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PACK, loadJson } from "@glt/contracts";
import {
  ExitCode,
  computeImpact,
  type CompiledSnapshot,
  type ComputeImpactInput,
  type ImpactEdgeView,
  type ImpactNodeView,
} from "@glt/domain";
import {
  impactGraphFromSnapshot,
  impactMaxTraversalDepth,
  loadPropagationMatrix,
} from "@glt/impact";
import { runLintAuthority } from "@glt/cli";
import { createWriter } from "../packages/cli/src/output.ts";

const GOLDEN_SNAPSHOT = join(PACK.examples, "golden", "bootstrap-snapshot.json");
const ENTRY = "glt.controlplane.registry.entry";
const CHECK = "glt.controlplane.check";
const GATE = "glt.controlplane.gate.bootstrap";
const OUTSIDE = "glt.seeded.injected-outside";

function goldenInput(
  overrides: Partial<ComputeImpactInput> = {},
): ComputeImpactInput {
  const snapshot = loadJson<CompiledSnapshot>(GOLDEN_SNAPSHOT);
  const graph = impactGraphFromSnapshot(snapshot);
  return {
    reportId: "imp-bootstrap-001",
    snapshotId: snapshot.snapshot_id,
    snapshotDigest: snapshot.digest,
    boundaryId: snapshot.boundary_id,
    nodes: graph.nodes,
    edges: graph.edges,
    boundaryNodes: graph.nodes.map((node) => node.id),
    matrix: loadPropagationMatrix(),
    sources: [
      {
        repository: "glt-controlplane",
        path: "glt-specpack/docs/SPEC/registry.md",
        authority: "glt-id-registry",
        role: "changed",
      },
    ],
    maxDepth: impactMaxTraversalDepth(),
    ...overrides,
  };
}

describe("DEV-11 seeded failures S1-S3", () => {
  it("S1 INV-05 dropping the validates edge fails the gate", () => {
    const control = computeImpact(goldenInput());
    expect(control.required_checks).toEqual([CHECK]);
    expect(control.release?.gate).toBe(GATE);
    expect(control.release?.state).toBe("pending");

    const injected = computeImpact(
      goldenInput({
        edges: goldenInput().edges.filter((edge) => edge.relation !== "validates"),
      }),
    );
    expect(injected.required_checks).toEqual([]);
    expect(injected.release).toBeUndefined();
    expect(injected.affected_nodes).toContain(ENTRY);
  });

  it("S2 INV-05 extra node outside the boundary yields known_unknowns", () => {
    const control = computeImpact(goldenInput());
    expect(control.known_unknowns).toEqual([]);

    const extraNode: ImpactNodeView = {
      id: OUTSIDE,
      sources: [{ path: "glt-specpack/docs/EXPERIMENTS/seeded-outside.md" }],
    };
    const extraEdge: ImpactEdgeView = {
      id: "glt.edge.seeded.injected-outside-depends-entry",
      from: OUTSIDE,
      to: ENTRY,
      relation: "depends_on",
      change: ["interface"],
      incident: [],
      assertions: [{ plane: "intended", status: "asserted" }],
    };
    const base = goldenInput();
    const injected = computeImpact(
      goldenInput({
        nodes: [...base.nodes, extraNode],
        edges: [...base.edges, extraEdge],
        boundaryNodes: base.boundaryNodes,
      }),
    );
    expect(
      injected.known_unknowns.some(
        (item) => item.kind === "outside_boundary" && item.ref === OUTSIDE,
      ),
    ).toBe(true);
    expect(injected.affected_nodes).not.toContain(OUTSIDE);
    expect(injected.coverage_not_established).toBe(true);
  });

  it("S3 INV-01 duplicate authority owner fails the verifier", () => {
    let stdout = "";
    const writer = createWriter(
      { format: "json", quiet: true },
      { out: (s) => (stdout += s), err: () => {} },
    );
    const code = runLintAuthority(writer, {
      loadClasses: () => [
        { id: "glt-id-registry", owner: "registry", authoritativePaths: ["registry/"] },
        { id: "glt-id-registry", owner: "dashboard", authoritativePaths: ["registry/"] },
      ],
      loadNormativeDocs: () => [],
    });
    expect(code).toBe(ExitCode.SourceConflict);
    const report = JSON.parse(stdout) as { blocked: boolean; conflict: string };
    expect(report.blocked).toBe(true);
    expect(report.conflict).toBe("source_conflict");
  });
});
