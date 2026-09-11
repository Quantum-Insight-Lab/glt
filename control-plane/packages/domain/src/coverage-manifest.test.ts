import { describe, expect, it } from "vitest";
import { GltError } from "./errors.ts";
import {
  COVERAGE_STEP,
  OUTSIDE_BOUNDARY_POLICY,
  completeImpactAllowed,
  coverageManifestFromDoc,
  coverageNotEstablished,
  reconcileCoverageManifest,
  rejectCompleteImpact,
} from "./coverage-manifest.ts";
import { computeImpact } from "./impact.ts";
import { CLASSIFIER_VERSION } from "./impact.ts";

const ENTRY = "glt.controlplane.registry.entry";
const COMPILER = "glt.controlplane.compiler";
const CHECK = "glt.controlplane.check";
const GATE = "glt.controlplane.gate.bootstrap";

function asError(run: () => unknown): GltError {
  try {
    run();
  } catch (error) {
    if (error instanceof GltError) return error;
    throw error;
  }
  throw new Error("expected GltError");
}

const manifestDoc = {
  apiVersion: "glt.dev/boundary/v1",
  kind: "BoundaryManifest",
  metadata: { id: "glt.bootstrap-slice", revision: 1 },
  spec: {
    title: "slice",
    nodes: [ENTRY, COMPILER],
    edges: ["glt.edge.compiler-depends-registry"],
    outside_boundary_policy: OUTSIDE_BOUNDARY_POLICY,
  },
};

describe("DEV-19 coverage manifest", () => {
  it("parses the boundary document as coverage data", () => {
    const manifest = coverageManifestFromDoc(manifestDoc);
    expect(manifest.id).toBe("glt.bootstrap-slice");
    expect(manifest.revision).toBe(1);
    expect(manifest.nodes).toEqual([ENTRY, COMPILER]);
    expect(manifest.outside_boundary_policy).toBe(OUTSIDE_BOUNDARY_POLICY);
    expect(COVERAGE_STEP).toBe("glt.dev.19");
  });

  it("INV-05 bundle and boundary listing different node ids fail reconciliation", () => {
    const error = asError(() =>
      reconcileCoverageManifest(
        { nodes: ["a"], edges: ["e1"] },
        { nodes: ["a", "b"], edges: ["e1"] },
      ),
    );
    expect(error.code).toBe(2);
    expect(error.message).toBe("bundle and boundary manifest diverge");
    expect(error.refs).toContain("bundle:b");
  });

  it("INV-05 coverage_not_established is derived from unknowns, not a caller bit", () => {
    expect(coverageNotEstablished([{ kind: "outside_boundary" }])).toBe(true);
    expect(coverageNotEstablished([{ kind: "unmapped_source" }])).toBe(true);
    expect(coverageNotEstablished([{ kind: "uncovered_relation" }])).toBe(false);
    expect(coverageNotEstablished([])).toBe(false);
    expect(
      completeImpactAllowed({
        coverage_not_established: false,
        known_unknowns: [{ kind: "outside_boundary", ref: "glt.controlplane.outside" }],
      }),
    ).toBe(false);
  });

  it("INV-05 a complete-impact claim is rejected when the walk left the manifest", () => {
    const error = asError(() =>
      rejectCompleteImpact({
        coverage_not_established: false,
        known_unknowns: [{ kind: "outside_boundary", ref: "glt.controlplane.outside" }],
      }),
    );
    expect(error.invariant).toBe("INV-05");
    expect(error.code).toBe(3);
    expect(error.message).toBe("complete impact is forbidden outside the coverage manifest");
    expect(error.refs).toContain("glt.controlplane.outside");
  });

  it("INV-05 empty coverage nodes are a contract error, not a fallback to the snapshot", () => {
    const error = asError(() =>
      computeImpact({
        reportId: "imp-empty-boundary",
        snapshotId: "snap-bootstrap-golden-001",
        snapshotDigest: "sha256:5bca8f91f0a92a6ae60dc83515810b388b809649101f76a500d235a490c65b41",
        boundaryId: "glt.bootstrap-slice@1",
        nodes: [
          { id: ENTRY, sources: [{ path: "glt-specpack/docs/SPEC/registry.md" }] },
          { id: COMPILER, sources: [{ path: "glt-specpack/docs/SPEC/snapshots.md" }] },
          { id: CHECK, sources: [{ path: "glt-specpack/docs/SPEC/invariants.md" }] },
          { id: GATE, sources: [{ path: "glt-specpack/docs/00-governance/pre-code-gate.md" }] },
        ],
        edges: [],
        boundaryNodes: [],
        matrix: { version: "1.0.0", rules: [], uncoveredRelations: [] },
        sources: [
          {
            repository: "glt-controlplane",
            path: "glt-specpack/docs/SPEC/registry.md",
            authority: "glt-id-registry",
            role: "changed",
          },
        ],
        maxDepth: 8,
        classifierVersion: CLASSIFIER_VERSION,
        labels: ["interface"],
      }),
    );
    expect(error.code).toBe(2);
    expect(error.message).toBe("coverage manifest nodes are required");
  });
});
