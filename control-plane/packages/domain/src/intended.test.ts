import { describe, expect, it } from "vitest";
import { GltError, assembleIntendedGraph, type IntendedStepCard } from "./index.ts";

const bootstrapEntry = (id: string): Record<string, unknown> => ({
  apiVersion: "glt.dev/v1alpha1",
  kind: "RegistryEntry",
  metadata: { id, revision: 1, namespace: "glt.controlplane", title: id },
  spec: { kind: "node", node: { type: "tool", lifecycle: "planned", owner: "engineering", criticality: "high" } },
});

const bootstrapEdge = (id: string, from: string, to: string): Record<string, unknown> => ({
  apiVersion: "glt.dev/v1alpha1",
  kind: "Edge",
  metadata: { id },
  spec: {
    from,
    to,
    relation: "depends_on",
    assertions: [{ plane: "intended", status: "asserted", evidence: null }],
    propagation: { change: [], incident: [] },
  },
});

const step = (id: string, dependsOn: readonly string[], status = "planned"): IntendedStepCard => ({
  id,
  path: `glt-specpack/docs/DEV/${id}.md`,
  title: id,
  owner: "engineering",
  status,
  dependsOn,
  gate: "none",
  risk: "medium",
});

describe("DEV-09 intended meta-graph", () => {
  it("INV-03 depends_on from DEV frontmatter changes the graph without a second map", () => {
    const bootstrap = {
      bootstrapEntries: [bootstrapEntry("glt.controlplane.check")],
      bootstrapEdges: [
        bootstrapEdge("glt.edge.gate-gates-check", "glt.controlplane.gate.bootstrap", "glt.controlplane.check"),
      ],
      components: [
        {
          id: "glt.controlplane.cli",
          source: {
            repository: "glt-controlplane",
            path: "control-plane/packages/cli",
            authority: "engineering-contract",
            role: "contract",
          },
        },
      ],
    };
    const left = assembleIntendedGraph({
      ...bootstrap,
      steps: [step("glt.dev.08", ["glt.dev.07"]), step("glt.dev.07", [])],
    });
    const right = assembleIntendedGraph({
      ...bootstrap,
      steps: [step("glt.dev.08", ["glt.dev.06"]), step("glt.dev.06", []), step("glt.dev.07", [])],
    });
    expect(left.boundaryEdges).toContain("glt.edge.glt.dev.08-depends-glt.dev.07");
    expect(left.boundaryEdges).not.toContain("glt.edge.glt.dev.08-depends-glt.dev.06");
    expect(right.boundaryEdges).toContain("glt.edge.glt.dev.08-depends-glt.dev.06");
    expect(right.boundaryEdges).not.toContain("glt.edge.glt.dev.08-depends-glt.dev.07");
  });

  it("PROTO-05 a planned step without code carries expected_from_step and is not rejected", () => {
    const graph = assembleIntendedGraph({
      bootstrapEntries: [bootstrapEntry("glt.controlplane.check")],
      bootstrapEdges: [],
      components: [],
      steps: [step("glt.dev.10", [])],
    });
    const entry = graph.entries.find((item) => {
      const metadata = item["metadata"] as { id?: string };
      return metadata.id === "glt.dev.10";
    }) as {
      spec: { node: { lifecycle: string; delivery: { expectedFromStep: string; status: string } } };
    };
    expect(entry.spec.node.lifecycle).toBe("planned");
    expect(entry.spec.node.delivery.expectedFromStep).toBe("glt.dev.10");
    expect(entry.spec.node.delivery.status).toBe("planned");
    expect(graph.boundaryNodes).toContain("glt.dev.10");
  });

  it("an unknown depends_on is a contract error, not a skipped edge", () => {
    try {
      assembleIntendedGraph({
        bootstrapEntries: [bootstrapEntry("glt.controlplane.check")],
        bootstrapEdges: [],
        components: [],
        steps: [step("glt.dev.08", ["glt.dev.99"])],
      });
      throw new Error("expected GltError");
    } catch (error) {
      expect(error).toBeInstanceOf(GltError);
      expect((error as GltError).code).toBe(2);
    }
  });
});
