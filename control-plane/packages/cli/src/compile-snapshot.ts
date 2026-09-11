import { COLLECTOR_VERSION, collectGitFromRepo } from "@glt/collectors";
import { compileSnapshotFromPaths, renderCompiledSnapshot } from "@glt/snapshot";
import {
  ExitCode,
  isIntendedBoundaryRef,
  materializedGraphDigest,
  pinBuildFacts,
} from "@glt/domain";
import type { Writer } from "./output.ts";

export interface CompileSnapshotCliOptions {
  readonly registry?: string;
  readonly boundary?: string;
  readonly matrix?: string;
  readonly asOf?: string;
}

export function runCompileSnapshot(
  writer: Writer,
  options: CompileSnapshotCliOptions = {},
): number {
  try {
    const snapshot = compileSnapshotFromPaths({
      ...(options.registry !== undefined ? { registry: options.registry } : {}),
      ...(options.boundary !== undefined ? { boundary: options.boundary } : {}),
      ...(options.matrix !== undefined ? { matrix: options.matrix } : {}),
      ...(options.asOf !== undefined ? { asOf: options.asOf } : {}),
      ...intendedBuildPins(options.boundary),
    });
    writer.artifact(snapshot, renderCompiledSnapshot);
    return ExitCode.Success;
  } catch (error) {
    return writer.fail(error);
  }
}

function intendedBuildPins(boundary: string | undefined): {
  extraSourceDigests?: Record<string, string>;
  extraCollectorVersions?: Record<string, string>;
} {
  if (!isIntendedBoundaryRef(boundary)) return {};
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
