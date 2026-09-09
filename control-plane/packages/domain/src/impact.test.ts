import { describe, expect, it } from "vitest";
import {
  CLASSIFIER_VERSION,
  classifyChange,
  computeImpact,
  type ComputeImpactInput,
  type ImpactEdgeView,
  type ImpactMatrixView,
  type ImpactNodeView,
  type ImpactRuleView,
} from "./impact.ts";
import { GltError } from "./errors.ts";

const ENTRY = "glt.controlplane.registry.entry";
const COMPILER = "glt.controlplane.compiler";
const CHECK = "glt.controlplane.check";
const GATE = "glt.controlplane.gate.bootstrap";
const OUTSIDE = "glt.controlplane.outside";

const depends: ImpactRuleView = {
  id: "depends",
  mode: "change",
  relation: "depends_on",
  changed_endpoint: "to",
  change_classes: ["interface", "schema", "content"],
  planes: ["intended"],
  direction: "against_edge",
  edge_filter: "propagation.change",
  effects: ["mark_affected"],
  stop: ["max_depth", "visited", "boundary"],
};

const validates: ImpactRuleView = {
  id: "validates",
  mode: "change",
  relation: "validates",
  changed_endpoint: "to",
  change_classes: ["interface", "schema", "content"],
  planes: ["intended"],
  direction: "none",
  edge_filter: "propagation.change",
  effects: ["require_check"],
  stop: ["visited"],
};

const gates: ImpactRuleView = {
  id: "gates",
  mode: "change",
  relation: "gates",
  changed_endpoint: "to",
  change_classes: ["interface", "schema", "content"],
  planes: ["intended"],
  direction: "none",
  edge_filter: "none",
  effects: ["gate_pending"],
  stop: ["visited"],
};

const matrix = (rules: readonly ImpactRuleView[], uncovered: readonly string[] = ["writes"]): ImpactMatrixView => ({
  version: "1.0.0",
  rules,
  uncoveredRelations: uncovered,
});

const node = (id: string, path: string): ImpactNodeView => ({
  id,
  sources: [{ path, repository: "glt-controlplane" }],
});

const edge = (
  id: string,
  from: string,
  to: string,
  relation: string,
  change: readonly string[] = ["interface"],
): ImpactEdgeView => ({
  id,
  from,
  to,
  relation,
  change,
  incident: [],
  assertions: [{ plane: "intended", status: "asserted" }],
});

const BOOTSTRAP_NODES = [
  node(ENTRY, "glt-specpack/docs/SPEC/registry.md"),
  node(COMPILER, "glt-specpack/docs/SPEC/snapshots.md"),
  node(CHECK, "glt-specpack/docs/SPEC/invariants.md"),
  node(GATE, "glt-specpack/docs/00-governance/pre-code-gate.md"),
];

const BOOTSTRAP_EDGES = [
  edge("glt.edge.compiler-depends-registry", COMPILER, ENTRY, "depends_on", ["dependency", "interface", "schema"]),
  edge("glt.edge.check-validates-compiler", CHECK, COMPILER, "validates", [
    "behavior",
    "content",
    "interface",
    "schema",
  ]),
  edge("glt.edge.gate-gates-check", GATE, CHECK, "gates", []),
];

function base(overrides: Partial<ComputeImpactInput> = {}): ComputeImpactInput {
  return {
    reportId: "imp-bootstrap-001",
    snapshotId: "snap-bootstrap-golden-001",
    snapshotDigest: "sha256:5bca8f91f0a92a6ae60dc83515810b388b809649101f76a500d235a490c65b41",
    boundaryId: "glt.bootstrap-slice@1",
    nodes: BOOTSTRAP_NODES,
    edges: BOOTSTRAP_EDGES,
    boundaryNodes: [ENTRY, COMPILER, CHECK, GATE],
    matrix: matrix([depends, validates, gates]),
    sources: [
      {
        repository: "glt-controlplane",
        path: "glt-specpack/docs/SPEC/registry.md",
        authority: "glt-id-registry",
        role: "changed",
      },
    ],
    maxDepth: 8,
    ...overrides,
  };
}

describe("DEV-10 impact engine", () => {
  it("INV-05 swapping the matrix changes the walk; rules are not hardcoded", () => {
    const withDepends = computeImpact(base());
    const without = computeImpact(base({ matrix: matrix([validates, gates]) }));
    expect(withDepends.affected_nodes).toContain(COMPILER);
    expect(without.affected_nodes).not.toContain(COMPILER);
  });

  it("INV-05 an uncovered relation is known_unknowns, never a silent skip", () => {
    const report = computeImpact(
      base({
        edges: [
          ...BOOTSTRAP_EDGES,
          edge("glt.edge.compiler-writes-registry", COMPILER, ENTRY, "writes"),
        ],
      }),
    );
    expect(report.known_unknowns.some((item) => item.kind === "uncovered_relation")).toBe(true);
    expect(report.known_unknowns.find((item) => item.kind === "uncovered_relation")?.ref).toBe(
      "glt.edge.compiler-writes-registry",
    );
  });

  it("INV-05 a change that leaves the boundary lists known_unknowns", () => {
    const report = computeImpact(
      base({
        nodes: [...BOOTSTRAP_NODES, node(OUTSIDE, "outside.md")],
        edges: [
          ...BOOTSTRAP_EDGES,
          edge("glt.edge.outside-depends-entry", OUTSIDE, ENTRY, "depends_on", ["interface"]),
        ],
        boundaryNodes: [ENTRY, COMPILER, CHECK, GATE],
      }),
    );
    expect(report.known_unknowns.some((item) => item.kind === "outside_boundary" && item.ref === OUTSIDE)).toBe(
      true,
    );
    expect(report.affected_nodes).not.toContain(OUTSIDE);
    expect(report.coverage_not_established).toBe(true);
  });

  it("validates puts the check in required_checks, not affected_nodes", () => {
    const report = computeImpact(base());
    expect(report.required_checks).toEqual([CHECK]);
    expect(report.affected_nodes).not.toContain(CHECK);
    expect(report.affected_nodes).toEqual([COMPILER, ENTRY]);
    expect(report.release?.gate).toBe(GATE);
    expect(report.release?.state).toBe("pending");
  });

  it("INV-12 LLM-only labels never become gate input", () => {
    const deterministic = computeImpact(base({ llmLabels: ["schema"] }));
    const llmAttempt = computeImpact(base({ labels: ["interface"], llmLabels: ["schema"] }));
    expect(deterministic.change.labels).toEqual(["interface"]);
    expect(deterministic.change.classifier_version).toBe(CLASSIFIER_VERSION);
    expect(llmAttempt.change.labels).toEqual(["interface"]);
    expect(llmAttempt.affected_nodes).toEqual(deterministic.affected_nodes);
    expect(classifyChange("glt-specpack/docs/SPEC/registry.md")).toEqual(["interface"]);
  });

  it("PROTO-07 a topology cycle does not cycle execution: traversal terminates", () => {
    const a = "glt.node.a";
    const b = "glt.node.b";
    const report = computeImpact(
      base({
        nodes: [node(a, "a.md"), node(b, "b.md")],
        edges: [
          edge("glt.edge.a-depends-b", a, b, "depends_on"),
          edge("glt.edge.b-depends-a", b, a, "depends_on"),
        ],
        boundaryNodes: [a, b],
        sources: [{ repository: "glt-controlplane", path: "a.md", authority: "engineering-contract" }],
        labels: ["interface"],
        matrix: matrix([depends]),
      }),
    );
    expect(report.affected_nodes).toEqual([a, b].sort());
  });

  it("PROTO-07 an execution-order cycle among gates is rejected", () => {
    const checkA = "glt.check.a";
    const checkB = "glt.check.b";
    const gateA = "glt.gate.a";
    const gateB = "glt.gate.b";
    try {
      computeImpact(
        base({
          nodes: [
            node(ENTRY, "glt-specpack/docs/SPEC/registry.md"),
            node(checkA, "a.md"),
            node(checkB, "b.md"),
            node(gateA, "ga.md"),
            node(gateB, "gb.md"),
          ],
          edges: [
            edge("e-va", checkA, ENTRY, "validates"),
            edge("e-vb", checkB, ENTRY, "validates"),
            edge("e-ga", gateA, checkA, "gates", []),
            edge("e-gb", gateB, checkB, "gates", []),
            edge("e-cycle-a", gateA, gateB, "gates", []),
            edge("e-cycle-b", gateB, gateA, "gates", []),
          ],
          boundaryNodes: [ENTRY, checkA, checkB, gateA, gateB],
          matrix: matrix([validates, gates]),
        }),
      );
      throw new Error("expected GltError");
    } catch (error) {
      expect(error).toBeInstanceOf(GltError);
      expect((error as GltError).invariant).toBe("PROTO-07");
      expect((error as GltError).code).toBe(3);
    }
  });

  it("the report pins snapshot_digest, classifier_version and matrix_version", () => {
    const report = computeImpact(base());
    expect(report.snapshot_digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(report.change.classifier_version).toBe(CLASSIFIER_VERSION);
    expect(report.change.matrix_version).toBe("1.0.0");
  });
});
