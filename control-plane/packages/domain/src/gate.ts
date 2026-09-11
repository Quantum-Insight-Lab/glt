/**
 * Gate state from gated checks (DEV-15). Pure: signals and the `gates`
 * graph arrive already parsed. Filesystem stays outside domain.
 *
 * The evaluator records state. It does not merge, release or write.
 *
 * Contract: glt-specpack/docs/SPEC/gates.md
 */

import { EVENT_SCHEMA_VERSION, EventType } from "@glt/contracts";
import { ExitCode, contractInvalid, usageError, type ExitCode as GltExitCode } from "./errors.ts";

export const GATE_STEP = "glt.dev.15" as const;

export type CheckState = "unknown" | "pending" | "passed" | "failed";
export type GateState = "unknown" | "open" | "pending" | "passed" | "failed" | "blocked";

export type GateEvidence =
  | { readonly kind: "check_report"; readonly ref: string; readonly check_state: CheckState }
  | { readonly kind: "closed_gate"; readonly ref: string }
  | { readonly kind: "explicit_block"; readonly ref: string };

export interface GateUnknown {
  readonly kind: "ungated_required";
  readonly ref: string;
}

export interface GateEdgeView {
  readonly from: string;
  readonly to: string;
  readonly relation: string;
}

export interface CheckSignal {
  readonly check_id: string;
  readonly state: CheckState;
}

export interface EvaluateGateInput {
  readonly gate_id: string;
  readonly snapshot_digest: string;
  readonly gated_checks: readonly string[];
  readonly required_checks?: readonly string[];
  readonly signals?: readonly CheckSignal[];
  readonly explicit_block?: string;
  readonly merge?: boolean;
  readonly llmLabels?: readonly string[];
}

export interface GateEvaluation {
  readonly event_type: typeof EventType.GateEvaluated;
  readonly schema_version: number;
  readonly gate_id: string;
  readonly state: GateState;
  readonly snapshot_digest: string;
  readonly evidence: readonly GateEvidence[];
  readonly known_unknowns: readonly GateUnknown[];
}

export function gatedChecks(edges: readonly GateEdgeView[], gateId: string): string[] {
  const ids = new Set<string>();
  for (const edge of edges) {
    if (edge.relation === "gates" && edge.from === gateId && edge.to.length > 0) {
      ids.add(edge.to);
    }
  }
  return [...ids].sort(compare);
}

export function gatedChecksFromSnapshot(edges: readonly unknown[], gateId: string): string[] {
  return gatedChecks(snapshotEdges(edges), gateId);
}

export function evaluateGate(input: EvaluateGateInput): GateEvaluation {
  if (input.merge === true) {
    throw usageError("gate in v1 evaluates only; it does not merge", [input.gate_id]);
  }
  // llmLabels are review-only and never become gate input (INV-12).
  void input.llmLabels;

  const gateId = input.gate_id.trim();
  const snapshotDigest = input.snapshot_digest.trim();
  if (gateId.length === 0) throw contractInvalid("gate_id is required", ["gate_id"]);
  if (snapshotDigest.length === 0) {
    throw contractInvalid("snapshot_digest is required", ["snapshot_digest"]);
  }

  const gated = uniqueSorted(input.gated_checks);
  const requiredAll = uniqueSorted(input.required_checks ?? []);
  const gatedSet = new Set(gated);
  const required = requiredAll.filter((id) => gatedSet.has(id));
  const unknowns: GateUnknown[] = requiredAll
    .filter((id) => !gatedSet.has(id))
    .map((ref) => ({ kind: "ungated_required" as const, ref }));

  const signals = new Map<string, CheckState>();
  for (const signal of input.signals ?? []) {
    const id = signal.check_id.trim();
    if (id.length === 0 || !gatedSet.has(id)) continue;
    signals.set(id, signal.state);
  }

  const block = input.explicit_block?.trim() ?? "";
  if (block.length > 0) {
    return result(gateId, snapshotDigest, "blocked", [{ kind: "explicit_block", ref: block }], unknowns);
  }

  const failed = gated.filter((id) => signals.get(id) === "failed");
  if (failed.length > 0) {
    return result(
      gateId,
      snapshotDigest,
      "blocked",
      failed.map((id) => checkReport(id, "failed")),
      unknowns,
    );
  }

  if (gated.length === 0) {
    return result(gateId, snapshotDigest, "unknown", [], unknowns);
  }

  const missing = required.filter((id) => {
    const state = signals.get(id);
    return state === undefined || state === "unknown";
  });
  if (missing.length > 0) {
    return result(
      gateId,
      snapshotDigest,
      "unknown",
      missing.map((id) => checkReport(id, "unknown")),
      unknowns,
    );
  }

  const waiting = required.filter((id) => signals.get(id) === "pending");
  if (waiting.length > 0) {
    return result(
      gateId,
      snapshotDigest,
      "pending",
      waiting.map((id) => checkReport(id, "pending")),
      unknowns,
    );
  }

  if (required.length > 0) {
    return result(
      gateId,
      snapshotDigest,
      "passed",
      [{ kind: "closed_gate", ref: gateId }, ...required.map((id) => checkReport(id, "passed"))],
      unknowns,
    );
  }

  return result(gateId, snapshotDigest, "open", [], unknowns);
}

export function gateEvaluationExit(evaluation: GateEvaluation): GltExitCode {
  if (evaluation.state === "passed" || evaluation.state === "open") return ExitCode.Success;
  if (evaluation.state === "blocked" || evaluation.state === "failed") return ExitCode.PolicyDenied;
  return ExitCode.EvidenceInsufficient;
}

function result(
  gateId: string,
  snapshotDigest: string,
  state: GateState,
  evidence: readonly GateEvidence[],
  unknowns: readonly GateUnknown[],
): GateEvaluation {
  return {
    event_type: EventType.GateEvaluated,
    schema_version: EVENT_SCHEMA_VERSION[EventType.GateEvaluated],
    gate_id: gateId,
    state,
    snapshot_digest: snapshotDigest,
    evidence: [...evidence].sort((a, b) => compare(a.ref, b.ref) || compare(a.kind, b.kind)),
    known_unknowns: [...unknowns].sort((a, b) => compare(a.ref, b.ref)),
  };
}

function checkReport(ref: string, check_state: CheckState): GateEvidence {
  return { kind: "check_report", ref, check_state };
}

function snapshotEdges(edges: readonly unknown[]): GateEdgeView[] {
  const out: GateEdgeView[] = [];
  for (const item of edges) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
    const spec = (item as { spec?: unknown })["spec"];
    if (spec === null || typeof spec !== "object" || Array.isArray(spec)) continue;
    const rec = spec as Record<string, unknown>;
    if (typeof rec["from"] !== "string" || typeof rec["to"] !== "string" || typeof rec["relation"] !== "string") {
      continue;
    }
    out.push({ from: rec["from"], to: rec["to"], relation: rec["relation"] });
  }
  return out;
}

function uniqueSorted(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))].sort(compare);
}

function compare(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
