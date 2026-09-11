/**
 * Intended-boundary extras for snapshot compile (DEV-20/21).
 * Pins git facts. Does not fold modules into `nodes[]`.
 */
import { materializedGraphDigest, pinBuildFacts } from "@glt/domain";
import { COLLECTOR_VERSION, collectGitFromRepo } from "./git.ts";

export function intendedSnapshotExtras(): {
  readonly extraSourceDigests: Record<string, string>;
  readonly extraCollectorVersions: Record<string, string>;
} {
  const git = collectGitFromRepo({ commit: "HEAD" });
  const pinned = pinBuildFacts({
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
  return {
    extraSourceDigests: pinned.sourceDigests,
    extraCollectorVersions: pinned.collectorVersions,
  };
}
