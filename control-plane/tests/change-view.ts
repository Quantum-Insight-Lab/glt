import { REPO_ROOT, loadParameterCards } from "@glt/contracts";
import { collectGitFromRepo } from "@glt/collectors";
import {
  comparePlanes,
  evaluateState,
  parameterSpecFromCard,
  parameterValue,
  planeNodesFromGitModules,
  planeNodesFromRegistryEntries,
  projectChangeSurface,
  type ChangePlaneFilter,
  type ChangeSurface,
  type DeliveryState,
  type NodeStateDraft,
} from "@glt/domain";
import { compileIntendedFromPack } from "@glt/registry";
import { compileSnapshotFromPaths } from "@glt/snapshot";

const P03 = "glt.param.dashboard.max_top_level_nodes";
const P01 = "glt.param.snapshot.stale_after_seconds";
const AS_OF = "2026-08-14T10:00:00Z";
const REPO = "https://github.com/Quantum-Insight-Lab/glt.git";
const DELIVERY: readonly DeliveryState[] = [
  "planned",
  "ready",
  "in_progress",
  "verified",
  "blocked",
];

export function dashboardMaxTopLevel(override?: number): number {
  return parameterValue(card(P03), override);
}

export function assembleChangeView(options: {
  readonly plane?: ChangePlaneFilter;
  readonly selected_id?: string;
  readonly max_top_level?: number;
} = {}): ChangeSurface {
  const intended = compileIntendedFromPack();
  const git = collectGitFromRepo({
    repoRoot: REPO_ROOT,
    commit: "HEAD",
    repositoryUrl: REPO,
  });
  const snapshot = compileSnapshotFromPaths({
    asOf: AS_OF,
    boundary: intended.compiled.boundary,
    snapshotId: "snap-change-view",
  });
  const planes = comparePlanes({
    intended: planeNodesFromRegistryEntries(intended.compiled.entries),
    materialized: planeNodesFromGitModules(git.module_graph.nodes),
  });
  const state = evaluateState({
    nodes: nodeDrafts(snapshot.nodes),
    ageSeconds: 0,
    staleAfterSeconds: parameterValue(card(P01)),
  });
  const axes: Record<string, { name: string; value: string; provenance: string }[]> = {};
  for (const node of state.nodes) {
    axes[node.node_id] = Object.entries(node.axes).map(([name, axis]) => ({
      name,
      value: axis.value,
      provenance: axis.provenance,
    }));
  }
  return projectChangeSurface({
    snapshot_id: snapshot.snapshot_id,
    snapshot_digest: snapshot.digest,
    as_of: snapshot.as_of,
    ...(snapshot.pinned_to.git_sha !== undefined ? { git_sha: snapshot.pinned_to.git_sha } : {}),
    freshness: state.snapshot_freshness,
    conflict: state.conflict,
    write_blocked: state.write_blocked,
    plane: options.plane ?? "combined",
    ...(options.selected_id !== undefined ? { selected_id: options.selected_id } : {}),
    max_top_level: dashboardMaxTopLevel(options.max_top_level),
    rows: planes.rows,
    axes,
  });
}

function card(id: string) {
  for (const raw of loadParameterCards()) {
    const spec = parameterSpecFromCard(raw);
    if (spec.id === id) return spec;
  }
  throw new Error(`parameter card missing: ${id}`);
}

function nodeDrafts(nodes: readonly unknown[]): NodeStateDraft[] {
  return nodes.flatMap((raw) => {
    if (!isRecord(raw) || !isRecord(raw["metadata"]) || !isRecord(raw["spec"])) return [];
    const id = raw["metadata"]["id"];
    if (typeof id !== "string") return [];
    const status = isRecord(raw["spec"]["delivery"]) ? raw["spec"]["delivery"]["status"] : undefined;
    return [
      {
        id,
        ...(typeof status === "string" && (DELIVERY as readonly string[]).includes(status)
          ? { delivery: status as DeliveryState }
          : {}),
      },
    ];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
