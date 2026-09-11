import { describe, expect, it } from "vitest";
import { PACK, loadJson } from "@glt/contracts";
import { COLLECTOR_VERSION, collectGitFromRepo } from "@glt/collectors";
import {
  INTENDED_BOUNDARY_REF,
  materializedGraphDigest,
  pinBuildFacts,
} from "@glt/domain";
import { compileSnapshotFromPaths } from "@glt/snapshot";
import { run } from "@glt/cli";
import { join } from "node:path";
import { REPO_ROOT } from "@glt/contracts";

const AS_OF = "2026-08-14T10:00:00Z";
const GOLDEN = join(PACK.examples, "golden", "bootstrap-snapshot.json");
const REPO = "https://github.com/Quantum-Insight-Lab/glt.git";

describe("DEV-20 build facts on a snapshot", () => {
  it("PROTO-03 bootstrap golden digest is unchanged when build facts are absent", () => {
    const golden = loadJson<{
      digest: string;
      as_of: string;
      snapshot_id: string;
      collector_versions: Record<string, string>;
      pinned_to?: { git_sha?: string; artifact_digest?: string; deployment_id?: string };
    }>(GOLDEN);
    const rebuilt = compileSnapshotFromPaths({
      asOf: golden.as_of,
      snapshotId: golden.snapshot_id,
      ...(golden.pinned_to !== undefined ? { pinnedTo: golden.pinned_to } : {}),
    });
    expect(rebuilt.digest).toBe(golden.digest);
    expect(rebuilt.collector_versions).not.toHaveProperty("git");
  });

  it("PROTO-03 intended snapshot with pinned git facts is deterministic", () => {
    const extras = gitPins();
    const left = compileSnapshotFromPaths({
      asOf: AS_OF,
      boundary: INTENDED_BOUNDARY_REF,
      snapshotId: "snap-intended-build",
      extraSourceDigests: extras.sourceDigests,
      extraCollectorVersions: extras.collectorVersions,
    });
    const right = compileSnapshotFromPaths({
      asOf: AS_OF,
      boundary: INTENDED_BOUNDARY_REF,
      snapshotId: "snap-intended-build",
      extraSourceDigests: extras.sourceDigests,
      extraCollectorVersions: extras.collectorVersions,
    });
    expect(left.digest).toBe(right.digest);
    expect(left.collector_versions.git).toBe(COLLECTOR_VERSION);
    expect(left.source_digests["git.module_graph"]).toMatch(/^sha256:[0-9a-f]{64}$/);
    const ids = left.nodes.map((node) => (node as { metadata: { id: string } }).metadata.id);
    expect(ids.some((id) => id.startsWith("control-plane/"))).toBe(false);
    expect(ids).toContain("glt.controlplane.dashboard");
  });

  it("PROTO-03 adding build facts changes the intended digest", () => {
    const bare = compileSnapshotFromPaths({
      asOf: AS_OF,
      boundary: INTENDED_BOUNDARY_REF,
      snapshotId: "snap-intended-build",
    });
    const extras = gitPins();
    const pinned = compileSnapshotFromPaths({
      asOf: AS_OF,
      boundary: INTENDED_BOUNDARY_REF,
      snapshotId: "snap-intended-build",
      extraSourceDigests: extras.sourceDigests,
      extraCollectorVersions: extras.collectorVersions,
    });
    expect(pinned.digest).not.toBe(bare.digest);
    expect(bare.collector_versions).not.toHaveProperty("git");
  });

  it("glt compile snapshot --boundary intended pins git and does not write the workspace", async () => {
    const result = await run([
      "compile",
      "snapshot",
      "--boundary",
      INTENDED_BOUNDARY_REF,
      "--as-of",
      AS_OF,
      "-o",
      "json",
    ]);
    expect(result.code).toBe(0);
    const body = JSON.parse(result.stdout) as {
      collector_versions: Record<string, string>;
      nodes: { metadata: { id: string } }[];
    };
    expect(body.collector_versions.git).toBe(COLLECTOR_VERSION);
    expect(body.nodes.some((node) => node.metadata.id.startsWith("control-plane/"))).toBe(false);
  });
});

function gitPins() {
  const git = collectGitFromRepo({
    repoRoot: REPO_ROOT,
    commit: "HEAD",
    repositoryUrl: REPO,
  });
  return pinBuildFacts({
    sourceDigests: {},
    collectorVersions: {},
    gitVersion: COLLECTOR_VERSION,
    gitDigests: git.source_digests,
    graphDigest: materializedGraphDigest({
      commit: git.commit,
      coverage: git.coverage,
      nodes: git.module_graph.nodes.map((node) => node.id),
      edges: git.module_graph.edges.map((edge) => ({ from: edge.from, to: edge.to })),
    }),
  });
}
