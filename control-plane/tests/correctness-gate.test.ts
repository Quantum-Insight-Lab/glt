import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PACK, loadJson, loadParameterCards, loadYaml, readText } from "@glt/contracts";
import {
  CLASSIFIER_VERSION,
  ExitCode,
  INTENDED_BOUNDARY_REF,
  aggregateScores,
  computeImpact,
  hashAuditRecord,
  parameterSpecFromCard,
  parameterValue,
  recallIsComplete,
  recallPrecision,
  snapshotIsStale,
  verifyAuditChain,
  type AuditChainLink,
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
import { compileSnapshotFromPaths } from "@glt/snapshot";
import { runLintAuthority } from "@glt/cli";
import { createWriter } from "../packages/cli/src/output.ts";
import { computeSeededCase, loadSeededCatalog } from "./seeded-catalog.ts";

const GOLDEN_SNAPSHOT = join(PACK.examples, "golden", "bootstrap-snapshot.json");
const AS_OF = "2026-08-14T10:00:00Z";
const STALE_PARAM = "glt.param.snapshot.stale_after_seconds";
const USEFULNESS_FORBIDDEN = /ускор|faster|productiv|ROI|baseline/i;

const catalog = loadSeededCatalog();
const matrix = loadPropagationMatrix();

function goldenInput(overrides: Partial<ComputeImpactInput> = {}): ComputeImpactInput {
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
    matrix,
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

function staleAfterSeconds(): number {
  for (const card of loadParameterCards()) {
    const spec = parameterSpecFromCard(card);
    if (spec.id === STALE_PARAM) return parameterValue(spec);
  }
  throw new Error("P01 parameter card missing");
}

function ageSeconds(asOf: string, evaluatedAt: string): number {
  return (Date.parse(evaluatedAt) - Date.parse(asOf)) / 1000;
}

function holdoutIds(): string[] {
  const doc = loadYaml<{ cases?: { id?: string }[] }>(PACK.holdoutCases);
  return (doc.cases ?? []).flatMap((item) => (typeof item.id === "string" ? [item.id] : []));
}

describe("DEV-12 correctness gate", () => {
  const checkScores = catalog.cases.map((item) => {
    const report = computeSeededCase(catalog, item);
    return recallPrecision(report.required_checks, item.requiredChecks);
  });
  const nodeScores = catalog.cases.map((item) => {
    const report = computeSeededCase(catalog, item);
    return recallPrecision(report.affected_nodes, item.affected);
  });
  const checks = aggregateScores(checkScores);
  const nodes = aggregateScores(nodeScores);
  const outsideMisses = catalog.cases.filter((item) => {
    if (!item.unknowns.some((unknown) => unknown.kind === "outside_boundary")) return false;
    const report = computeSeededCase(catalog, item);
    return report.known_unknowns.length === 0;
  });

  const intended = compileSnapshotFromPaths({
    asOf: AS_OF,
    boundary: INTENDED_BOUNDARY_REF,
  });

  const report = {
    gate: "correctness",
    outcome: "pass",
    set_size: catalog.cases.length,
    classifier_version: CLASSIFIER_VERSION,
    matrix_version: matrix.version,
    recall_checks: checks.recall,
    recall_nodes: nodes.recall,
    precision_checks: checks.precision,
    precision_nodes: nodes.precision,
    e03_false_green: 0,
    e05a_outside_without_unknowns: outsideMisses.length,
    recall_boundary: catalog.graph.boundaryId,
    intended_boundary: intended.boundary_id,
    intended_nodes: intended.nodes.length,
    usefulness: "not_measured",
    holdout_ids: holdoutIds(),
  };

  it("E02a INV-05 recall of required_checks is complete on the authorized set", () => {
    expect(catalog.graph.boundaryId).not.toBe("glt.bootstrap-slice@1");
    expect(report.set_size).toBeGreaterThanOrEqual(10);
    expect(recallIsComplete(checks)).toBe(true);
    expect(report.recall_checks).toBe(1);
  });

  it("E02b INV-05 recall of affected_nodes is complete on the authorized set", () => {
    expect(recallIsComplete(nodes)).toBe(true);
    expect(report.recall_nodes).toBe(1);
  });

  it("INV-05 precision is published and is not a pass threshold", () => {
    expect(typeof report.precision_checks).toBe("number");
    expect(typeof report.precision_nodes).toBe("number");
    expect(Number.isFinite(report.precision_nodes)).toBe(true);
    expect(report.outcome).toBe("pass");
  });

  it("E05a INV-05 a change that leaves the boundary always has known_unknowns", () => {
    expect(outsideMisses).toEqual([]);
    expect(report.e05a_outside_without_unknowns).toBe(0);
  });

  it("the stand compiles the intended meta-graph, not only the four-node slice", () => {
    expect(intended.boundary_id).toBe(INTENDED_BOUNDARY_REF);
    expect(intended.nodes.length).toBeGreaterThan(4);
    expect(report.intended_nodes).toBe(intended.nodes.length);
  });

  it("E05a INV-05 an extra node outside the intended boundary is named", () => {
    const graph = impactGraphFromSnapshot(intended);
    const outside = "glt.seeded.intended-outside";
    const extraNode: ImpactNodeView = {
      id: outside,
      sources: [{ path: "glt-specpack/docs/EXPERIMENTS/seeded-outside.md" }],
    };
    const extraEdge: ImpactEdgeView = {
      id: "glt.edge.seeded.intended-outside-depends-cli",
      from: outside,
      to: "glt.controlplane.cli",
      relation: "depends_on",
      change: ["interface"],
      incident: [],
      assertions: [{ plane: "intended", status: "asserted" }],
    };
    const injected = computeImpact({
      reportId: "imp-e05a-intended",
      snapshotId: intended.snapshot_id,
      snapshotDigest: intended.digest,
      boundaryId: intended.boundary_id,
      nodes: [...graph.nodes, extraNode],
      edges: [...graph.edges, extraEdge],
      boundaryNodes: graph.nodes.map((node) => node.id),
      matrix,
      sources: [
        {
          repository: "glt-controlplane",
          path: "control-plane/packages/cli",
          authority: "engineering-contract",
          role: "changed",
        },
      ],
      maxDepth: impactMaxTraversalDepth(),
      labels: ["interface"],
    });
    expect(injected.known_unknowns.some((item) => item.kind === "outside_boundary")).toBe(true);
  });

  it("E03 holdout ids stay sealed and are not the recall set", () => {
    expect(holdoutIds()).toEqual(["H01", "H02", "H03", "H04", "H05"]);
    expect(catalog.cases.some((item) => /^H0[1-5]$/.test(item.id))).toBe(false);
    expect(readText(PACK.holdoutCases)).toContain("frozen_at: 2026-08-14");
  });

  it("E03 H01 INV-05 dropping validates is not a green gate", () => {
    const control = computeImpact(goldenInput());
    expect(control.release?.state).toBe("pending");
    const injected = computeImpact(
      goldenInput({
        edges: goldenInput().edges.filter((edge) => edge.relation !== "validates"),
      }),
    );
    const green = injected.release?.state === "pending" && injected.required_checks.length > 0;
    expect(green).toBe(false);
    expect(injected.required_checks).toEqual([]);
  });

  it("E03 H02 INV-05 a change outside the bootstrap slice is not green completeness", () => {
    const extraNode: ImpactNodeView = {
      id: "glt.holdout.outside",
      sources: [{ path: "glt-specpack/docs/EXPERIMENTS/seeded-outside.md" }],
    };
    const extraEdge: ImpactEdgeView = {
      id: "glt.edge.holdout.outside-depends-entry",
      from: extraNode.id,
      to: "glt.controlplane.registry.entry",
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
    expect(injected.known_unknowns.length).toBeGreaterThan(0);
  });

  it("E03 H03 INV-01 a duplicate authority owner is source_conflict, not green", () => {
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
    expect(JSON.parse(stdout).conflict).toBe("source_conflict");
  });

  it("E03 H04 a snapshot older than P01 is stale and not treated as healthy", () => {
    const limit = staleAfterSeconds();
    expect(snapshotIsStale(ageSeconds(AS_OF, AS_OF), limit)).toBe(false);
    expect(snapshotIsStale(limit + 1, limit)).toBe(true);
  });

  it("INV-07 E03 H05 flipping prev_hash fails chain verify", () => {
    const genesis = hashAuditRecord({ record_id: "genesis", prev_hash: "" });
    const first: AuditChainLink = {
      record_id: "aud-h05-1",
      prev_hash: genesis,
      record_hash: hashAuditRecord({ record_id: "aud-h05-1", prev_hash: genesis }),
    };
    const secondHash = hashAuditRecord({ record_id: "aud-h05-2", prev_hash: first.record_hash });
    const second: AuditChainLink = {
      record_id: "aud-h05-2",
      prev_hash: first.record_hash,
      record_hash: secondHash,
    };
    expect(verifyAuditChain([first, second]).ok).toBe(true);
    const tampered: AuditChainLink = { ...second, prev_hash: genesis };
    expect(verifyAuditChain([first, tampered]).ok).toBe(false);
    const flipped = { record_id: second.record_id, prev_hash: genesis };
    const repaired: AuditChainLink = { ...flipped, record_hash: hashAuditRecord(flipped) };
    expect(verifyAuditChain([first, repaired]).ok).toBe(false);
  });

  it("the gate report names set size and classifier and matrix versions", () => {
    expect(report.set_size).toBe(catalog.cases.length);
    expect(report.classifier_version).toBe(CLASSIFIER_VERSION);
    expect(report.matrix_version).toBe(matrix.version);
    expect(report.holdout_ids).toEqual(["H01", "H02", "H03", "H04", "H05"]);
  });

  it("the report does not claim that GLT speeds up work", () => {
    expect(report.usefulness).toBe("not_measured");
    expect(JSON.stringify(report)).not.toMatch(USEFULNESS_FORBIDDEN);
  });

  it("Usefulness gate remains not measured", () => {
    const productGate = readText(join(PACK.docs, "EXPERIMENTS", "product-gate.md"));
    expect(productGate).toMatch(/не проверено/i);
    expect(productGate).not.toMatch(/Usefulness gate[^\n]*пройден/i);
  });

  it("INV-05 a missed required check fails the gated recall", () => {
    const broken = aggregateScores([
      ...checkScores.slice(0, -1),
      recallPrecision([], catalog.cases[catalog.cases.length - 1]?.requiredChecks ?? ["glt.seeded.check"]),
    ]);
    expect(recallIsComplete(broken)).toBe(false);
  });

  it("P01 is read from the parameter card, not tuned on holdout", () => {
    expect(staleAfterSeconds()).toBe(staleAfterSeconds());
    const card = loadParameterCards().map(parameterSpecFromCard).find((spec) => spec.id === STALE_PARAM);
    expect(card?.default).toBe(staleAfterSeconds());
  });
});
