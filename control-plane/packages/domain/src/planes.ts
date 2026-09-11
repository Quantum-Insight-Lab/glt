/**
 * Build-plane comparison (DEV-18). Pure: intended and materialized node
 * lists arrive already parsed. The function compares. It does not merge
 * the two lists into one graph and it does not call a missing node broken.
 *
 * A planned node with `expected_from_step` and no materialized twin is
 * `expected` (PROTO-05). Any other mismatch is `plane_drift`, a separate
 * class, not a failure.
 *
 * Contract: glt-specpack/docs/SPEC/architecture.md
 */

import { contractInvalid } from "./errors.ts";

export const PLANES_STEP = "glt.dev.18" as const;

export type PlaneName = "intended" | "materialized";
export type PlanePresence = PlaneName | "both";
export type PlaneDeltaClass = "aligned" | "expected" | "plane_drift";

export interface PlaneNode {
  readonly id: string;
  readonly path?: string;
  readonly expectedFromStep?: string;
}

export interface PlaneDelta {
  readonly id: string;
  readonly presence: PlanePresence;
  readonly class: PlaneDeltaClass;
  readonly path?: string;
  readonly expected_from_step?: string;
}

export interface PlaneComparison {
  readonly intended_ids: readonly string[];
  readonly materialized_ids: readonly string[];
  readonly rows: readonly PlaneDelta[];
}

export function comparePlanes(input: {
  readonly intended: readonly PlaneNode[];
  readonly materialized: readonly PlaneNode[];
}): PlaneComparison {
  const intended = input.intended.map(normalizeNode);
  const materialized = input.materialized.map(normalizeNode);
  const intendedByKey = indexByKey(intended);
  const materializedByKey = indexByKey(materialized);
  const keys = unique([...intendedByKey.keys(), ...materializedByKey.keys()]);

  const rows = keys.map((key) => {
    const left = intendedByKey.get(key);
    const right = materializedByKey.get(key);
    if (left !== undefined && right !== undefined) {
      return delta(left.id, "both", "aligned", left.path ?? right.path, left.expectedFromStep);
    }
    if (left !== undefined) {
      const expected = left.expectedFromStep !== undefined;
      return delta(
        left.id,
        "intended",
        expected ? "expected" : "plane_drift",
        left.path,
        left.expectedFromStep,
      );
    }
    return delta(right!.id, "materialized", "plane_drift", right!.path, undefined);
  });

  return {
    intended_ids: unique(intended.map((node) => node.id)),
    materialized_ids: unique(materialized.map((node) => node.id)),
    rows: rows.sort((a, b) => compare(a.id, b.id)),
  };
}

/** Registry entries stay on the intended plane. Paths come from SourceRef. */
export function planeNodesFromRegistryEntries(
  entries: readonly { readonly id: string; readonly spec: unknown }[],
): PlaneNode[] {
  return entries.map((entry) => {
    const id = entry.id.trim();
    if (id.length === 0) throw contractInvalid("intended node id is required", ["id"]);
    const spec = asRecord(entry.spec);
    const node = spec === undefined ? undefined : asRecord(spec["node"]);
    const delivery = node === undefined ? undefined : asRecord(node["delivery"]);
    const sources = node === undefined ? undefined : node["sources"];
    const expectedFromStep =
      delivery !== undefined && typeof delivery["expectedFromStep"] === "string"
        ? delivery["expectedFromStep"].trim()
        : "";
    const path = firstSourcePath(sources);
    return {
      id,
      ...(path !== undefined ? { path } : {}),
      ...(expectedFromStep.length > 0 ? { expectedFromStep } : {}),
    };
  });
}

/** Git collector module ids are workspace paths on the materialized plane. */
export function planeNodesFromGitModules(
  modules: readonly { readonly id: string }[],
): PlaneNode[] {
  return modules.map((module) => {
    const id = module.id.trim();
    if (id.length === 0) throw contractInvalid("materialized node id is required", ["id"]);
    return { id, path: id };
  });
}

function normalizeNode(node: PlaneNode): PlaneNode {
  const id = node.id.trim();
  if (id.length === 0) throw contractInvalid("plane node id is required", ["id"]);
  const path = node.path?.trim() ?? "";
  const expectedFromStep = node.expectedFromStep?.trim() ?? "";
  return {
    id,
    ...(path.length > 0 ? { path } : {}),
    ...(expectedFromStep.length > 0 ? { expectedFromStep } : {}),
  };
}

function indexByKey(nodes: readonly PlaneNode[]): Map<string, PlaneNode> {
  const out = new Map<string, PlaneNode>();
  for (const node of nodes) {
    const key = joinKey(node);
    const prior = out.get(key);
    if (prior !== undefined && prior.id !== node.id) {
      throw contractInvalid("two intended or materialized nodes share a join key", [
        key,
        prior.id,
        node.id,
      ]);
    }
    out.set(key, node);
  }
  return out;
}

function joinKey(node: PlaneNode): string {
  return (node.path ?? node.id).normalize("NFC");
}

function delta(
  id: string,
  presence: PlanePresence,
  klass: PlaneDeltaClass,
  path: string | undefined,
  expectedFromStep: string | undefined,
): PlaneDelta {
  return {
    id,
    presence,
    class: klass,
    ...(path !== undefined && path.length > 0 ? { path } : {}),
    ...(expectedFromStep !== undefined && expectedFromStep.length > 0
      ? { expected_from_step: expectedFromStep }
      : {}),
  };
}

function firstSourcePath(sources: unknown): string | undefined {
  if (!Array.isArray(sources)) return undefined;
  for (const item of sources) {
    const rec = asRecord(item);
    if (rec === undefined) continue;
    const path = rec["path"];
    if (typeof path === "string" && path.trim().length > 0) return path.trim();
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compare);
}

function compare(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
