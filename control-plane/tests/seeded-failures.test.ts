import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PACK, loadJson, loadParameterCards } from "@glt/contracts";
import {
  ExitCode,
  GltError,
  admitSandbox,
  computeImpact,
  hashAuditRecord,
  parameterSpecFromCard,
  parameterValue,
  sandboxProfileFor,
  snapshotIsStale,
  verifyAuditChain,
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

describe("DEV-32 seeded failures S4-S6", () => {
  it("S4 PROTO-12 backdating the snapshot timestamp is stale", () => {
    const snapshot = loadJson<CompiledSnapshot>(GOLDEN_SNAPSHOT);
    const limit = p01();
    const now = snapshot.as_of;
    expect(snapshotIsStale(ageSeconds(snapshot.as_of, now) ?? 0, limit)).toBe(false);
    const backdated = { ...snapshot, as_of: "2020-01-01T00:00:00Z" };
    const age = ageSeconds(backdated.as_of, now);
    expect(age).toBeGreaterThan(limit);
    expect(snapshotIsStale(age ?? 0, limit)).toBe(true);
  });

  it("S5 INV-07 flipping audit prev_hash fails verification", () => {
    const first = {
      record_id: "aud-s5-1",
      prev_hash: hashAuditRecord({ record_id: "genesis", prev_hash: "" }),
      record_hash: "",
    };
    first.record_hash = hashAuditRecord({ record_id: first.record_id, prev_hash: first.prev_hash });
    const second = {
      record_id: "aud-s5-2",
      prev_hash: first.record_hash,
      record_hash: "",
    };
    second.record_hash = hashAuditRecord({ record_id: second.record_id, prev_hash: second.prev_hash });
    expect(verifyAuditChain([first, second]).ok).toBe(true);
    const flipped = { ...second, prev_hash: first.prev_hash };
    expect(verifyAuditChain([first, flipped]).ok).toBe(false);
    expect(verifyAuditChain([first, flipped]).refs).toContain("aud-s5-2");
  });

  it("S6 INV-06 runner bind mount /etc is sandbox deny", () => {
    const timeout = p04();
    const image = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const legal = sandboxProfileFor(image, timeout);
    admitSandbox({ profile: legal, executor_image: image, timeout_limit_seconds: timeout });
    let caught: unknown;
    try {
      admitSandbox({
        profile: {
          ...legal,
          mounts: [...legal.mounts, { source: "/etc", target: "/mnt/etc", writable: false }],
        },
        executor_image: image,
        timeout_limit_seconds: timeout,
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(GltError);
    expect((caught as GltError).invariant).toBe("INV-06");
  });
});

const STALE_PARAM = "glt.param.snapshot.stale_after_seconds";
const TIMEOUT_PARAM = "glt.param.runner.default_timeout_seconds";

function p01(): number {
  return parameter(STALE_PARAM);
}

function p04(): number {
  return parameter(TIMEOUT_PARAM);
}

function parameter(id: string): number {
  for (const card of loadParameterCards()) {
    const spec = parameterSpecFromCard(card);
    if (spec.id === id) return parameterValue(spec);
  }
  throw new Error(`missing parameter ${id}`);
}

function ageSeconds(producedAt: string, asOf: string): number | undefined {
  const start = Date.parse(producedAt);
  const end = Date.parse(asOf);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return undefined;
  return Math.floor((end - start) / 1000);
}
