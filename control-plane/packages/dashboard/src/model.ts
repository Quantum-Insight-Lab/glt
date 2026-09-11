/**
 * Render props for the Change surface. The object is produced by
 * `projectChangeSurface` in domain. This package does not import domain (S-2).
 */

export type PlaneFilter = "intended" | "materialized" | "combined";

export interface AxisView {
  readonly name: string;
  readonly value: string;
  readonly provenance: string;
}

export interface NodeView {
  readonly id: string;
  readonly presence: "intended" | "materialized" | "both";
  readonly class: "aligned" | "expected" | "plane_drift";
  readonly path?: string;
  readonly expected_from_step?: string;
  readonly runtime: string;
  readonly axes: readonly AxisView[];
}

export interface ChangeView {
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
  readonly plane: PlaneFilter;
  readonly selected_id?: string;
  readonly visible: readonly NodeView[];
  readonly hidden: number;
  readonly selected?: NodeView;
}
