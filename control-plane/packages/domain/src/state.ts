/**
 * Node state axes (DEV-16) plus freshness/conflict ceilings (DEV-17). Pure:
 * snapshot fields, ages and optional signals arrive already parsed. The
 * evaluator classifies. It does not create evidence, merge or write.
 *
 * Freshness vs P01 uses `snapshotIsStale` (S-4). Expired signals are dropped
 * before they become current observations (PROTO-11). Missing runtime is
 * `unknown`, never `healthy` (PROTO-12). Inference is never rewritten as
 * observation (INV-04). Stale or `source_conflict` blocks write/runner.
 *
 * Contract: glt-specpack/docs/SPEC/topology.md, degradation.md
 */

import {
  assessDegradation,
  currentSignal,
  detectFactConflict,
  type FactClaim,
} from "./degrade.ts";
import { ExitCode, contractInvalid, usageError, type ExitCode as GltExitCode } from "./errors.ts";
import { snapshotIsStale } from "./freshness.ts";

export const STATE_STEP = "glt.dev.16" as const;

export type ProvenanceClass = "declaration" | "discovery" | "observation" | "inference";

export type VerificationState = "unknown" | "pending" | "passed" | "failed" | "blocked";
export type RuntimeState = "unknown" | "healthy" | "degraded" | "unhealthy" | "unreachable";
export type FreshnessState = "current" | "drifted" | "stale";
export type ChangeState = "unchanged" | "modified" | "added" | "removed";
export type CoverageState = "unknown" | "partial" | "complete";
export type DeliveryState = "planned" | "ready" | "in_progress" | "verified" | "blocked";
export type ConflictState = "none" | "source_conflict";

export interface AxisValue<T extends string> {
  readonly value: T;
  readonly provenance: ProvenanceClass;
}

export interface NodeAxes {
  readonly verification: AxisValue<VerificationState>;
  readonly runtime: AxisValue<RuntimeState>;
  readonly freshness: AxisValue<FreshnessState>;
  readonly change: AxisValue<ChangeState>;
  readonly coverage: AxisValue<CoverageState>;
  readonly delivery: AxisValue<DeliveryState>;
  readonly conflict: AxisValue<ConflictState>;
}

export interface NodeState {
  readonly node_id: string;
  readonly axes: NodeAxes;
}

export interface StateUnknown {
  readonly kind: "missing_runtime";
  readonly ref: string;
}

export interface NodeStateDraft {
  readonly id: string;
  readonly delivery?: DeliveryState;
  readonly verification?: AxisValue<VerificationState>;
  readonly runtime?: AxisValue<RuntimeState> & { readonly ageSeconds?: number };
  readonly change?: AxisValue<ChangeState>;
  readonly coverage?: AxisValue<CoverageState>;
  readonly conflict?: AxisValue<ConflictState>;
}

export interface EvaluateStateInput {
  readonly nodes: readonly NodeStateDraft[];
  readonly ageSeconds: number;
  readonly staleAfterSeconds: number;
  readonly claims?: readonly FactClaim[];
  readonly createEvidence?: boolean;
}

export interface TopologyState {
  readonly snapshot_freshness: FreshnessState;
  readonly conflict: ConflictState;
  readonly write_blocked: boolean;
  readonly actions_above: "read";
  readonly nodes: readonly NodeState[];
  readonly known_unknowns: readonly StateUnknown[];
}

const AXIS_KEYS = [
  "verification",
  "runtime",
  "freshness",
  "change",
  "coverage",
  "delivery",
  "conflict",
] as const;

export function evaluateState(input: EvaluateStateInput): TopologyState {
  if (input.createEvidence === true) {
    throw usageError("state evaluator classifies only; it does not create evidence");
  }
  if (!Number.isFinite(input.ageSeconds) || !Number.isFinite(input.staleAfterSeconds)) {
    throw contractInvalid("freshness age and limit must be finite seconds", ["ageSeconds"]);
  }

  const snapshotFreshness: FreshnessState = snapshotIsStale(
    input.ageSeconds,
    input.staleAfterSeconds,
  )
    ? "stale"
    : "current";
  const freshness: AxisValue<FreshnessState> = {
    value: snapshotFreshness,
    provenance: "inference",
  };
  const detected = detectFactConflict(input.claims ?? []);
  const forcedConflict: AxisValue<ConflictState> | undefined =
    detected.conflict === "source_conflict"
      ? { value: "source_conflict", provenance: "inference" }
      : undefined;

  const nodes = [...input.nodes]
    .map((node) => evaluateNode(node, freshness, input.staleAfterSeconds, forcedConflict))
    .sort((a, b) => compare(a.node_id, b.node_id));

  const conflict: ConflictState =
    detected.conflict === "source_conflict" ||
    nodes.some((node) => node.axes.conflict.value === "source_conflict")
      ? "source_conflict"
      : "none";
  const degradation = assessDegradation({
    stale: snapshotFreshness === "stale",
    conflict: conflict === "source_conflict",
  });

  return {
    snapshot_freshness: snapshotFreshness,
    conflict,
    write_blocked: degradation.write_blocked,
    actions_above: degradation.actions_above,
    nodes,
    known_unknowns: nodes
      .filter((node) => asObservation(node.axes.runtime) === undefined)
      .map((node) => ({ kind: "missing_runtime" as const, ref: node.node_id })),
  };
}

export function evaluateNode(
  node: NodeStateDraft,
  freshness: AxisValue<FreshnessState>,
  staleAfterSeconds: number,
  forcedConflict?: AxisValue<ConflictState>,
): NodeState {
  const id = node.id.trim();
  if (id.length === 0) throw contractInvalid("node id is required", ["node.id"]);

  return {
    node_id: id,
    axes: {
      verification: bindAxis(node.verification, "unknown"),
      runtime: bindAxis(runtimeIfCurrent(node.runtime, staleAfterSeconds), "unknown"),
      freshness,
      change: bindAxis(node.change, "unchanged"),
      coverage: bindAxis(node.coverage, "unknown"),
      delivery: bindAxis(
        node.delivery !== undefined
          ? { value: node.delivery, provenance: "declaration" }
          : undefined,
        "planned",
      ),
      conflict: bindAxis(forcedConflict ?? node.conflict, "none"),
    },
  };
}

function runtimeIfCurrent(
  provided: (AxisValue<RuntimeState> & { readonly ageSeconds?: number }) | undefined,
  staleAfterSeconds: number,
): AxisValue<RuntimeState> | undefined {
  if (provided === undefined) return undefined;
  if (provided.ageSeconds === undefined) {
    return { value: provided.value, provenance: provided.provenance };
  }
  return currentSignal(
    {
      value: provided.value,
      provenance: provided.provenance,
      ageSeconds: provided.ageSeconds,
    },
    staleAfterSeconds,
  );
}

/** Keep the caller's class. Never promote inference to observation (INV-04). */
export function bindAxis<T extends string>(
  provided: AxisValue<T> | undefined,
  fallback: T,
): AxisValue<T> {
  if (provided === undefined) return { value: fallback, provenance: "inference" };
  if (provided.provenance === "observation") return { value: provided.value, provenance: "observation" };
  return { value: provided.value, provenance: provided.provenance };
}

/** Observation projection: inferred facts are not observations. */
export function asObservation<T extends string>(axis: AxisValue<T>): T | undefined {
  return axis.provenance === "observation" ? axis.value : undefined;
}

export function axisKeys(): readonly typeof AXIS_KEYS[number][] {
  return AXIS_KEYS;
}

export function healthExit(state: TopologyState): GltExitCode {
  if (state.conflict === "source_conflict") return ExitCode.SourceConflict;
  if (state.snapshot_freshness === "stale") return ExitCode.EvidenceInsufficient;
  const observedHealthy = state.nodes.every((node) => asObservation(node.axes.runtime) === "healthy");
  return observedHealthy && state.nodes.length > 0 ? ExitCode.Success : ExitCode.EvidenceInsufficient;
}

function compare(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
