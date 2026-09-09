import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PACK, REPO_ROOT, loadJson, readText } from "@glt/contracts";
import {
  GltError,
  compileSnapshot,
  digestOf,
  type CompiledSnapshot,
  type SnapshotEdgeDraft,
  type SnapshotNodeDraft,
} from "@glt/domain";
import { compileSnapshotFromPaths } from "@glt/snapshot";
import { run } from "@glt/cli";
import { readFileSync } from "node:fs";

function asError(run: () => unknown): GltError {
  try {
    run();
  } catch (error) {
    if (error instanceof GltError) return error;
    throw error;
  }
  throw new Error("expected GltError");
}

const PIN = {
  artifact_digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
} as const;

const AS_OF = "2026-08-14T10:00:00Z";

const nodeDraft = (id: string, declaration: Record<string, unknown> = {}): SnapshotNodeDraft => ({
  id,
  revision: 1,
  namespace: "glt.controlplane",
  title: id,
  aliases: [],
  declaration: {
    type: "tool",
    lifecycle: "planned",
    owner: "engineering",
    criticality: "high",
    ...declaration,
  },
});

const edgeDraft = (id: string, from: string, to: string): SnapshotEdgeDraft => ({
  id,
  from,
  to,
  relation: "depends_on",
  assertions: [
    { plane: "observed", status: "not_observed", evidence: null },
    { plane: "intended", status: "asserted", evidence: null },
    { plane: "materialized", status: "not_observed", evidence: null },
  ],
  change: ["schema", "interface"],
  incident: [],
});

const baseInput = {
  snapshotId: "snap-test",
  asOf: AS_OF,
  registryVersion: "0.2.0",
  boundaryId: "glt.bootstrap-slice@1",
  sourceDigests: { registry: PIN.artifact_digest },
  collectorVersions: { intent: "1.0.0", registry: "1.0.0" },
  pinnedTo: PIN,
  configProfile: "bootstrap",
  matrixVersion: "1.0.0",
};

describe("DEV-08 snapshot compiler", () => {
  it("INV-03 PROTO-03 two compiles of the same pinned inputs are byte-identical", () => {
    const left = compileSnapshotFromPaths({ asOf: AS_OF, pinnedTo: PIN });
    const right = compileSnapshotFromPaths({ asOf: AS_OF, pinnedTo: PIN });
    expect(JSON.stringify(left)).toBe(JSON.stringify(right));
    expect(left.digest).toBe(right.digest);
  });

  it("INV-03 changing as_of by one second changes the digest; key order does not", () => {
    const a = compileSnapshot({
      ...baseInput,
      nodes: [nodeDraft("b"), nodeDraft("a")],
      edges: [edgeDraft("e1", "b", "a")],
    });
    const b = compileSnapshot({
      ...baseInput,
      nodes: [nodeDraft("a"), nodeDraft("b")],
      edges: [edgeDraft("e1", "b", "a")],
    });
    expect(a.digest).toBe(b.digest);
    const later = compileSnapshot({
      ...baseInput,
      asOf: "2026-08-14T10:00:01Z",
      nodes: [nodeDraft("a"), nodeDraft("b")],
      edges: [edgeDraft("e1", "b", "a")],
    });
    expect(later.digest).not.toBe(a.digest);
  });

  it("PROTO-05 omitted sensitivity, capabilities and signals are materialized", () => {
    const snap = compileSnapshot({
      ...baseInput,
      nodes: [nodeDraft("a")],
      edges: [],
    });
    const node = snap.nodes[0] as {
      spec: { sensitivity: string; capabilities: unknown[]; signals: unknown[] };
    };
    expect(node.spec.sensitivity).toBe("internal");
    expect(node.spec.capabilities).toEqual([]);
    expect(node.spec.signals).toEqual([]);
  });

  it("PROTO-04 nodes and edges are full objects, not a list of ids", () => {
    const snap = compileSnapshotFromPaths({ asOf: AS_OF, pinnedTo: PIN });
    expect(snap.nodes.length).toBeGreaterThan(0);
    for (const node of snap.nodes) {
      expect(typeof node).toBe("object");
      expect(node).toMatchObject({ apiVersion: "glt.dev/v1alpha1", kind: "Node" });
    }
    for (const edge of snap.edges) {
      expect(typeof edge).toBe("object");
      expect(edge).toMatchObject({ apiVersion: "glt.dev/v1alpha1", kind: "Edge" });
    }
    const error = asError(() =>
      compileSnapshot({
        ...baseInput,
        nodes: ["glt.controlplane.check"] as unknown as SnapshotNodeDraft[],
        edges: [],
      }),
    );
    expect(error.code).toBe(2);
    expect(error.message).toContain("full objects");
  });

  it("PROTO-10 an unpinned snapshot is rejected", () => {
    const error = asError(() =>
      compileSnapshot({
        ...baseInput,
        pinnedTo: {},
        nodes: [nodeDraft("a")],
        edges: [],
      }),
    );
    expect(error.invariant).toBe("PROTO-10");
    expect(error.code).toBe(3);
  });

  it("PROTO-10 a compiled snapshot carries git_sha, artifact_digest or deployment_id", () => {
    const snap = compileSnapshotFromPaths({ asOf: AS_OF, pinnedTo: PIN });
    const pins = [snap.pinned_to.git_sha, snap.pinned_to.artifact_digest, snap.pinned_to.deployment_id];
    expect(pins.some((p) => p !== undefined && p.length > 0)).toBe(true);
  });

  it("PROTO-03 digest is digestOf of the document with the digest member removed, not zeroed", () => {
    const snap = compileSnapshot({
      ...baseInput,
      nodes: [nodeDraft("a")],
      edges: [],
    });
    const { digest: stored, ...without } = snap;
    expect(digestOf(without)).toBe(stored);
    expect(digestOf(snap, "digest")).toBe(stored);
    const zeroed = { ...without, digest: "sha256:" + "0".repeat(64) };
    expect(digestOf(zeroed)).not.toBe(stored);
    expect(digestOf(zeroed, "digest")).toBe(stored);
  });

  it("PROTO-03 NFC-equivalent aliases produce the same digest", () => {
    const nfd = compileSnapshot({
      ...baseInput,
      nodes: [{ ...nodeDraft("a"), aliases: ["e\u0301"] }],
      edges: [],
    });
    const nfc = compileSnapshot({
      ...baseInput,
      nodes: [{ ...nodeDraft("a"), aliases: ["é"] }],
      edges: [],
    });
    expect(nfd.digest).toBe(nfc.digest);
  });

  it("arrays sort: nodes by metadata.id, assertions by plane, the rest lexicographically", () => {
    const snap = compileSnapshot({
      ...baseInput,
      nodes: [nodeDraft("b", { capabilities: ["z", "a"] }), nodeDraft("a")],
      edges: [edgeDraft("e-z", "b", "a")],
    });
    const ids = snap.nodes.map((n) => (n as { metadata: { id: string } }).metadata.id);
    expect(ids).toEqual(["a", "b"]);
    const caps = (snap.nodes[1] as { spec: { capabilities: string[] } }).spec.capabilities;
    expect(caps).toEqual(["a", "z"]);
    const planes = (
      snap.edges[0] as { spec: { assertions: { plane: string }[] } }
    ).spec.assertions.map((a) => a.plane);
    expect(planes).toEqual(["intended", "materialized", "observed"]);
    const change = (snap.edges[0] as { spec: { propagation: { change: string[] } } }).spec
      .propagation.change;
    expect(change).toEqual(["interface", "schema"]);
  });

  it("S-5 feeding a snapshot back into the compiler is rejected", async () => {
    const result = await run([
      "compile",
      "snapshot",
      "--registry",
      join(PACK.examples, "golden", "bootstrap-snapshot.json"),
      "-o",
      "json",
    ]);
    expect(result.code).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("does not accept a snapshot as input");
  });

  it("glt compile snapshot is deterministic and does not write the workspace", async () => {
    const args = ["compile", "snapshot", "--as-of", AS_OF, "-o", "json"];
    const first = await run(args);
    const second = await run(args);
    expect(first.code).toBe(0);
    expect(first.stdout).toBe(second.stdout);
    const body = JSON.parse(first.stdout) as CompiledSnapshot;
    expect(body.kind).toBe("TopologySnapshot");
    expect(body.digest).not.toBe("sha256:" + "0".repeat(64));
    expect(first.stdout).not.toContain(REPO_ROOT.replaceAll("\\", "\\\\"));
  });

  it("golden bootstrap snapshot stays unfrozen until DEV-09", () => {
    const golden = loadJson<{ digest: string }>(join(PACK.examples, "golden", "bootstrap-snapshot.json"));
    expect(golden.digest).toBe("sha256:" + "0".repeat(64));
  });

  it("S-4 the canonicalizer has no third-party dependency", () => {
    const pkg = JSON.parse(
      readFileSync(join(REPO_ROOT, "control-plane", "packages", "domain", "package.json"), "utf8"),
    ) as { dependencies?: unknown };
    expect(pkg.dependencies ?? {}).toEqual({});
    const src = readText(join(REPO_ROOT, "control-plane", "packages", "domain", "src", "canonical.ts"));
    expect(src).not.toMatch(/from ["'](?!node:|\.\/)/);
  });
});
