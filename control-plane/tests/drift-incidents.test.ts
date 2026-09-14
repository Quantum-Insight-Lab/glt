import { describe, expect, it } from "vitest";
import { COMMANDS, FORBIDDEN_COMMANDS } from "@glt/cli";
import {
  DRIFT_STEP,
  classifyDeployDrift,
  classifyIncidentPath,
  computeImpact,
} from "@glt/domain";
import { impactGraphFromSnapshot, loadPropagationMatrix } from "@glt/impact";
import { compileSnapshotFromPaths } from "@glt/snapshot";

const AS_OF = "2026-08-14T10:00:00Z";
const SOURCE = {
  repository: "glt-controlplane",
  path: "glt-specpack/docs/SPEC/registry.md",
  authority: "glt-id-registry",
  role: "changed",
} as const;

describe("DEV-26 drift and incidents", () => {
  it("is the DEV-26 step", () => {
    expect(DRIFT_STEP).toBe("glt.dev.26");
  });

  it("incident rows exist in the matrix and are not change rows", () => {
    const matrix = loadPropagationMatrix();
    const change = matrix.rules.filter((rule) => rule.mode === "change");
    const incident = matrix.rules.filter((rule) => rule.mode === "incident");
    expect(change.length).toBeGreaterThan(0);
    expect(incident.length).toBeGreaterThan(0);
    expect(incident.every((rule) => rule.mode !== "change")).toBe(true);
    expect(change.every((rule) => (rule.incident_classes ?? []).length === 0)).toBe(true);
  });

  it("INV-04 pack incident walk stays a candidate until trace-parentage", () => {
    const snapshot = compileSnapshotFromPaths({ asOf: AS_OF });
    const graph = impactGraphFromSnapshot(snapshot);
    const report = computeImpact({
      reportId: "imp-dev26-incident",
      snapshotId: snapshot.snapshot_id,
      snapshotDigest: snapshot.digest,
      boundaryId: snapshot.boundary_id,
      nodes: graph.nodes,
      edges: graph.edges,
      boundaryNodes: snapshot.nodes.map((node) => (node as { metadata: { id: string } }).metadata.id),
      matrix: loadPropagationMatrix(),
      sources: [SOURCE],
      maxDepth: 8,
      mode: "incident",
      labels: ["availability"],
    });
    expect(report.mode).toBe("incident");
    expect(report.change.labels).toEqual(["availability"]);
    for (const path of report.candidate_paths) {
      expect(path.length).toBeGreaterThan(1);
      expect(
        classifyIncidentPath({ plane: "materialized", traceParentage: false }),
      ).toBe("candidate");
    }
    expect(classifyIncidentPath({ plane: "observed", traceParentage: true })).toBe(
      "confirmed",
    );
  });

  it("PROTO-12 deploy hash drift is named on the live classifier", () => {
    const build = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
    expect(classifyDeployDrift({ buildHash: build, deploymentHash: build })).toBe("aligned");
    expect(
      classifyDeployDrift({
        buildHash: build,
        deploymentHash: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      }),
    ).toBe("drift");
  });

  it("S-10 glt drift is not a command", () => {
    expect(COMMANDS.map((command) => command.name)).not.toContain("drift");
    expect(FORBIDDEN_COMMANDS).not.toContain("drift");
  });
});
