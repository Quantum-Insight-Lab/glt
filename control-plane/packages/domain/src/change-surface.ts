/**
 * Change-mode projection (DEV-20). Pure: snapshot identity, plane rows and
 * axes arrive already parsed. The function projects. It does not merge
 * planes, enable glyphs, or write a status.
 *
 * Max visible nodes is the caller's P03 value, not a literal (S-8).
 *
 * Contract: glt-specpack/docs/SPEC/dashboard.md
 */

import { digestOf, isDigest } from "./digest.ts";
import { contractInvalid } from "./errors.ts";
import type { PlaneDelta, PlaneDeltaClass, PlanePresence } from "./planes.ts";

export const CHANGE_SURFACE_STEP = "glt.dev.20" as const;

export type ChangePlaneFilter = "intended" | "materialized" | "combined";

export interface ChangeAxisView {
  readonly name: string;
  readonly value: string;
  readonly provenance: string;
}

export interface ChangeNodeView {
  readonly id: string;
  readonly presence: PlanePresence;
  readonly class: PlaneDeltaClass;
  readonly path?: string;
  readonly expected_from_step?: string;
  readonly runtime: string;
  readonly axes: readonly ChangeAxisView[];
}

export interface ChangeSurface {
  readonly mode: "change";
  readonly glyph_layer: "blocked";
  readonly glyph_layer_reason: "E04";
  readonly snapshot_id: string;
  readonly snapshot_digest: string;
  readonly as_of: string;
  readonly git_sha?: string;
  readonly freshness: string;
  readonly conflict: string;
  readonly conflict_count: number;
  readonly write_blocked: boolean;
  readonly plane: ChangePlaneFilter;
  readonly selected_id?: string;
  readonly visible: readonly ChangeNodeView[];
  readonly hidden: number;
  readonly selected?: ChangeNodeView;
}

export function materializedGraphDigest(input: {
  readonly commit: string | null;
  readonly coverage: string;
  readonly nodes: readonly string[];
  readonly edges: readonly { readonly from: string; readonly to: string }[];
}): string {
  return digestOf({
    commit: input.commit ?? "",
    coverage: input.coverage,
    nodes: [...input.nodes].map((id) => id.normalize("NFC")).sort(),
    edges: input.edges.map((edge) => `${edge.from}>${edge.to}`.normalize("NFC")).sort(),
  });
}

export function pinBuildFacts(input: {
  readonly sourceDigests: Readonly<Record<string, string>>;
  readonly collectorVersions: Readonly<Record<string, string>>;
  readonly gitVersion: string;
  readonly gitDigests: Readonly<Record<string, string>>;
  readonly graphDigest: string;
}): {
  readonly sourceDigests: Record<string, string>;
  readonly collectorVersions: Record<string, string>;
} {
  if (input.gitVersion.length === 0) throw contractInvalid("git collector version is required");
  if (!isDigest(input.graphDigest)) {
    throw contractInvalid("build graph digest must be sha256:<hex>", [input.graphDigest]);
  }
  const sourceDigests: Record<string, string> = { ...input.sourceDigests };
  for (const [key, digest] of Object.entries(input.gitDigests)) {
    if (!isDigest(digest)) {
      throw contractInvalid("git source digest must be sha256:<hex>", [key]);
    }
    sourceDigests[`git.${key}`] = digest;
  }
  sourceDigests["git.module_graph"] = input.graphDigest;
  return {
    sourceDigests,
    collectorVersions: { ...input.collectorVersions, git: input.gitVersion },
  };
}

export function projectChangeSurface(input: {
  readonly snapshot_id: string;
  readonly snapshot_digest: string;
  readonly as_of: string;
  readonly git_sha?: string;
  readonly freshness: string;
  readonly conflict: string;
  readonly write_blocked: boolean;
  readonly plane: ChangePlaneFilter;
  readonly selected_id?: string;
  readonly max_top_level: number;
  readonly rows: readonly PlaneDelta[];
  readonly axes: Readonly<
    Record<string, readonly { readonly name: string; readonly value: string; readonly provenance: string }[]>
  >;
}): ChangeSurface {
  if (input.max_top_level < 1) {
    throw contractInvalid("max_top_level must be >= 1", [String(input.max_top_level)]);
  }
  const filtered = input.rows.filter((row) => matchesPlane(row, input.plane)).sort(byClassThenId);
  const hidden = Math.max(0, filtered.length - input.max_top_level);
  const visible = filtered.slice(0, input.max_top_level).map((row) => viewOf(row, input.axes));
  const selectedRow =
    input.selected_id === undefined
      ? undefined
      : input.rows.find((row) => row.id === input.selected_id);
  const selected = selectedRow === undefined ? undefined : viewOf(selectedRow, input.axes);
  return {
    mode: "change",
    glyph_layer: "blocked",
    glyph_layer_reason: "E04",
    snapshot_id: input.snapshot_id,
    snapshot_digest: input.snapshot_digest,
    as_of: input.as_of,
    ...(input.git_sha !== undefined && input.git_sha.length > 0 ? { git_sha: input.git_sha } : {}),
    freshness: input.freshness,
    conflict: input.conflict,
    conflict_count: input.conflict === "source_conflict" ? 1 : 0,
    write_blocked: input.write_blocked,
    plane: input.plane,
    ...(input.selected_id !== undefined ? { selected_id: input.selected_id } : {}),
    visible,
    hidden,
    ...(selected !== undefined ? { selected } : {}),
  };
}

function matchesPlane(row: PlaneDelta, plane: ChangePlaneFilter): boolean {
  if (plane === "combined") return true;
  if (plane === "intended") return row.presence === "intended" || row.presence === "both";
  return row.presence === "materialized" || row.presence === "both";
}

function viewOf(
  row: PlaneDelta,
  axes: Readonly<Record<string, readonly ChangeAxisView[]>>,
): ChangeNodeView {
  const nodeAxes = axes[row.id] ?? [];
  const runtime = nodeAxes.find((axis) => axis.name === "runtime")?.value ?? "unknown";
  return {
    id: row.id,
    presence: row.presence,
    class: row.class,
    ...(row.path !== undefined ? { path: row.path } : {}),
    ...(row.expected_from_step !== undefined ? { expected_from_step: row.expected_from_step } : {}),
    runtime,
    axes: nodeAxes,
  };
}

function byClassThenId(left: PlaneDelta, right: PlaneDelta): number {
  const rank = (klass: PlaneDeltaClass): number => {
    if (klass === "plane_drift") return 0;
    if (klass === "expected") return 1;
    return 2;
  };
  const byClass = rank(left.class) - rank(right.class);
  if (byClass !== 0) return byClass;
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}
