/**
 * Coverage manifest (DEV-19). Pure: the boundary document and registry id
 * lists arrive already parsed. The manifest is data. It is not inferred
 * from whichever nodes happen to sit in a snapshot.
 *
 * Divergence from the registry is a contract error, not a silent skip.
 * `coverage_not_established` is derived from known unknowns. A complete
 * impact claim is forbidden when that flag is set or when the walk left
 * the boundary (INV-05).
 *
 * Contract: glt-specpack/docs/SPEC/impact.md
 */

import { contractInvalid, invariantViolated } from "./errors.ts";

export const COVERAGE_STEP = "glt.dev.19" as const;

export const OUTSIDE_BOUNDARY_POLICY = "known_unknowns_required" as const;

const COVERAGE_GAPS = new Set(["outside_boundary", "unmapped_source"]);

export interface CoverageManifest {
  readonly id: string;
  readonly revision: number;
  readonly nodes: readonly string[];
  readonly edges: readonly string[];
  readonly outside_boundary_policy: typeof OUTSIDE_BOUNDARY_POLICY;
}

export interface CoverageRegistryIds {
  readonly nodes: readonly string[];
  readonly edges: readonly string[];
}

export interface CoverageHonestyInput {
  readonly coverage_not_established: boolean;
  readonly known_unknowns: readonly { readonly kind: string; readonly ref?: string }[];
}

export function coverageManifestFromDoc(doc: unknown): CoverageManifest {
  if (!isRecord(doc) || !isRecord(doc["metadata"]) || !isRecord(doc["spec"])) {
    throw contractInvalid("boundary manifest metadata or spec missing");
  }
  const id = asString(doc["metadata"]["id"], "metadata.id");
  const revision = doc["metadata"]["revision"];
  if (typeof revision !== "number" || !Number.isInteger(revision) || revision < 1) {
    throw contractInvalid("boundary manifest revision must be an integer >= 1", [id]);
  }
  const spec = doc["spec"];
  const nodes = stringList(spec["nodes"], "spec.nodes");
  const edges = stringList(spec["edges"], "spec.edges");
  if (nodes.length === 0) throw contractInvalid("coverage manifest nodes are required", [id]);
  if (spec["outside_boundary_policy"] !== OUTSIDE_BOUNDARY_POLICY) {
    throw contractInvalid("outside_boundary_policy must be known_unknowns_required", [id]);
  }
  return {
    id,
    revision,
    nodes,
    edges,
    outside_boundary_policy: OUTSIDE_BOUNDARY_POLICY,
  };
}

export function reconcileCoverageManifest(
  manifest: CoverageRegistryIds,
  registry: CoverageRegistryIds,
): void {
  const nodeDrift = setDrift(registry.nodes, manifest.nodes);
  const edgeDrift = setDrift(registry.edges, manifest.edges);
  if (nodeDrift.length === 0 && edgeDrift.length === 0) return;
  throw contractInvalid("bundle and boundary manifest diverge", [...nodeDrift, ...edgeDrift]);
}

/** Derived. Callers do not pass a hand-set completeness bit. */
export function coverageNotEstablished(
  unknowns: readonly { readonly kind: string }[],
): boolean {
  return unknowns.some((item) => COVERAGE_GAPS.has(item.kind));
}

/** «Полное влияние» is false whenever the walk left coverage or the flag is set. */
export function completeImpactAllowed(report: CoverageHonestyInput): boolean {
  return !report.coverage_not_established && !coverageNotEstablished(report.known_unknowns);
}

export function rejectCompleteImpact(report: CoverageHonestyInput): void {
  if (completeImpactAllowed(report)) return;
  const refs = report.known_unknowns
    .filter((item) => COVERAGE_GAPS.has(item.kind))
    .map((item) => item.ref)
    .filter((ref): ref is string => typeof ref === "string" && ref.length > 0);
  throw invariantViolated(
    "INV-05",
    "complete impact is forbidden outside the coverage manifest",
    refs,
  );
}

function setDrift(left: readonly string[], right: readonly string[]): string[] {
  const a = new Set(left);
  const b = new Set(right);
  const extra = left.filter((id) => !b.has(id)).map((id) => `bundle:${id}`);
  const missing = right.filter((id) => !a.has(id)).map((id) => `boundary:${id}`);
  return [...extra, ...missing].sort();
}

function stringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw contractInvalid(`${field} must be an array`);
  return value.map((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw contractInvalid(`${field} entries must be non-empty strings`, [String(index)]);
    }
    return item.trim();
  });
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw contractInvalid(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
